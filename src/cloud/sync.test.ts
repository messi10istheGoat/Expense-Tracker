import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeWorkspace, type Workspace } from '../finance/model';
import { SyncConflict, SyncEngine, type RemoteWorkspace } from './sync';
const personal = () => makeWorkspace(false);
const deferred = <T>() => {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function setup(remote: RemoteWorkspace | null = { workspace: personal(), revision: 1 }) {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
  const repo = {
    load: vi.fn(async () => remote),
    save: vi.fn(async (w: Workspace, r: number) => ({ workspace: w, revision: r + 1 })),
  };
  const engine = new SyncEngine(repo, personal(), storage, 'user-a');
  return { engine, repo, storage, values };
}
afterEach(() => vi.useRealTimers());
describe('revision-checked customer sync', () => {
  it('creates an empty account and only shows saved after a server acknowledgement', async () => {
    const { engine, repo } = setup(null),
      d = deferred<RemoteWorkspace>();
    repo.save.mockReturnValueOnce(d.promise);
    const start = engine.start();
    await Promise.resolve();
    expect(engine.getSnapshot().ready).toBe(false);
    expect(repo.save.mock.calls[0][0].demo).toBe(false);
    expect(repo.save.mock.calls[0][0].transactions).toHaveLength(0);
    d.resolve({ workspace: personal(), revision: 1 });
    await start;
    expect(engine.getSnapshot().status).toBe('saved');
    engine.dispose();
  });
  it('does not replace workspace or increment generation on unchanged polling', async () => {
    const { engine } = setup();
    await engine.start();
    const before = engine.getSnapshot();
    await engine.sync();
    expect(engine.getSnapshot().workspace).toBe(before.workspace);
    expect(engine.getSnapshot().generation).toBe(before.generation);
    engine.dispose();
  });
  it('applies a newer remote workspace once', async () => {
    const { engine, repo } = setup();
    await engine.start();
    const generation = engine.getSnapshot().generation;
    const remote = { ...personal(), profile: { ...personal().profile, name: 'Other device' } };
    repo.load.mockResolvedValueOnce({ workspace: remote, revision: 2 });
    await engine.sync();
    expect(engine.getSnapshot().workspace.profile.name).toBe('Other device');
    expect(engine.getSnapshot().generation).toBe(generation + 1);
    engine.dispose();
  });
  it('durably queues edits per user and clears pending recovery only after acknowledgement', async () => {
    const { engine, repo, values } = setup();
    await engine.start();
    const d = deferred<RemoteWorkspace>();
    repo.save.mockReturnValueOnce(d.promise);
    engine.change({ ...personal(), profile: { ...personal().profile, name: 'Edited' } });
    const sync = engine.sync();
    expect(values.has('user-a')).toBe(true);
    expect(engine.getSnapshot().status).toBe('saving');
    d.resolve({ workspace: personal(), revision: 2 });
    await sync;
    expect(engine.hasPending()).toBe(false);
    expect(values.has('user-a')).toBe(false);
    engine.dispose();
  });
  it('does not lose an edit arriving while saving; writes are serialized', async () => {
    vi.useFakeTimers();
    const { engine, repo } = setup();
    await engine.start();
    const d = deferred<RemoteWorkspace>();
    repo.save.mockReturnValueOnce(d.promise);
    engine.change({ ...personal(), profile: { ...personal().profile, name: 'First' } });
    const sync = engine.sync();
    engine.change({ ...personal(), profile: { ...personal().profile, name: 'Second' } });
    await engine.sync();
    expect(repo.save).toHaveBeenCalledTimes(1);
    d.resolve({ workspace: personal(), revision: 2 });
    await sync;
    expect(engine.hasPending()).toBe(true);
    expect(engine.getSnapshot().workspace.profile.name).toBe('Second');
    await vi.advanceTimersByTimeAsync(600);
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(repo.save.mock.calls[1][0].profile.name).toBe('Second');
    expect(repo.save.mock.calls[1][1]).toBe(2);
    expect(engine.hasPending()).toBe(false);
    engine.dispose();
  });
  it('never overwrites either version on conflict; explicit cloud choice clears pending edits', async () => {
    const { engine, repo, values } = setup();
    await engine.start();
    engine.change({ ...personal(), profile: { ...personal().profile, name: 'Device' } });
    repo.save.mockRejectedValueOnce(new SyncConflict());
    repo.load.mockResolvedValueOnce({
      workspace: { ...personal(), profile: { ...personal().profile, name: 'Cloud' } },
      revision: 3,
    });
    await engine.sync();
    expect(engine.getSnapshot().status).toBe('conflict');
    expect(engine.getSnapshot().workspace.profile.name).toBe('Device');
    await engine.sync();
    expect(repo.save).toHaveBeenCalledTimes(1);
    engine.resolve('cloud');
    expect(engine.getSnapshot().workspace.profile.name).toBe('Cloud');
    expect(values.has('user-a')).toBe(false);
    engine.dispose();
  });
  it('uses the conflict revision when explicitly replacing cloud with device records', async () => {
    const { engine, repo } = setup();
    await engine.start();
    engine.change({ ...personal(), profile: { ...personal().profile, name: 'Device' } });
    repo.save.mockRejectedValueOnce(new SyncConflict());
    repo.load.mockResolvedValueOnce({ workspace: personal(), revision: 3 });
    await engine.sync();
    engine.resolve('device');
    await Promise.resolve();
    expect(repo.save.mock.calls[1][1]).toBe(3);
    expect(repo.save.mock.calls[1][0].profile.name).toBe('Device');
    engine.dispose();
  });
  it('retains edits and a recovery file after a network failure', async () => {
    const { engine, repo, values } = setup();
    await engine.start();
    repo.save.mockRejectedValueOnce(new Error('Offline'));
    engine.change(personal());
    await engine.sync();
    expect(engine.getSnapshot().status).toBe('offline');
    expect(engine.hasPending()).toBe(true);
    expect(values.has('user-a')).toBe(true);
    engine.dispose();
  });
  it('recovers a pending workspace without copying another account’s records', async () => {
    const { engine, repo, values } = setup();
    values.set(
      'user-a',
      JSON.stringify({
        workspace: { ...personal(), profile: { ...personal().profile, name: 'Recovery' } },
        revision: 1,
      }),
    );
    values.set('user-b', 'do not touch');
    await engine.start();
    expect(repo.save.mock.calls[0][0].profile.name).toBe('Recovery');
    expect(values.get('user-b')).toBe('do not touch');
    engine.dispose();
  });
  it('keeps an edit made during a clean refresh pending', async () => {
    vi.useFakeTimers();
    const { engine, repo } = setup();
    await engine.start();
    const d = deferred<RemoteWorkspace | null>();
    repo.load.mockReturnValueOnce(d.promise);
    const sync = engine.sync();
    engine.change({ ...personal(), profile: { ...personal().profile, name: 'New' } });
    d.resolve({ workspace: personal(), revision: 1 });
    await sync;
    await vi.advanceTimersByTimeAsync(600);
    expect(repo.save.mock.calls[0][0].profile.name).toBe('New');
    engine.dispose();
  });
  it('reports storage failures without pretending changes are durable or saved', async () => {
    const { engine, storage, repo } = setup();
    await engine.start();
    storage.setItem = () => {
      throw new Error('Quota');
    };
    repo.save.mockRejectedValueOnce(new Error('offline'));
    engine.change(personal());
    expect(engine.getSnapshot().recoveryError).toBe(true);
    await engine.sync();
    expect(engine.hasPending()).toBe(true);
    expect(engine.getSnapshot().status).not.toBe('saved');
    engine.dispose();
  });
  it('preserves unreadable recovery until explicit discard and does not start cloud writes', async () => {
    const { engine, repo, values } = setup();
    values.set('user-a', 'broken JSON');
    await engine.start();
    expect(engine.getSnapshot().recoveryBlocked).toBe(true);
    expect(engine.getSnapshot().ready).toBe(false);
    await engine.sync();
    expect(repo.load).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(values.get('user-a')).toBe('broken JSON');
    await engine.discardRecovery();
    expect(engine.getSnapshot().ready).toBe(true);
    engine.dispose();
  });
  it('can reopen a previously acknowledged account offline without marking it synced', async () => {
    const { engine, repo, values } = setup();
    values.set(
      'user-a:saved',
      JSON.stringify({
        workspace: { ...personal(), profile: { ...personal().profile, name: 'Cached' } },
        revision: 3,
      }),
    );
    repo.load.mockRejectedValueOnce(new Error('offline'));
    await engine.start();
    expect(engine.getSnapshot().ready).toBe(true);
    expect(engine.getSnapshot().workspace.profile.name).toBe('Cached');
    expect(engine.getSnapshot().status).toBe('offline');
    expect(engine.hasPending()).toBe(false);
    engine.clearRecovery();
    expect(values.size).toBe(0);
    engine.dispose();
  });
  it('rejects demo snapshots before writing them', async () => {
    const { engine, repo } = setup();
    await engine.start();
    expect(() => engine.change(makeWorkspace())).toThrow();
    expect(repo.save).not.toHaveBeenCalled();
    engine.dispose();
  });
});
