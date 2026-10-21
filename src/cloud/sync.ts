import { validateWorkspace, type Workspace } from '../finance/model';
export interface RemoteWorkspace {
  workspace: Workspace;
  revision: number;
}
export interface Repository {
  load: () => Promise<RemoteWorkspace | null>;
  save: (workspace: Workspace, revision: number) => Promise<RemoteWorkspace>;
}
export class SyncConflict extends Error {
  constructor() {
    super('The cloud workspace changed on another device.');
  }
}
export type SyncStatus = 'loading' | 'saved' | 'saving' | 'pending' | 'offline' | 'conflict' | 'error';
export interface SyncSnapshot {
  workspace: Workspace;
  revision: number;
  ready: boolean;
  status: SyncStatus;
  generation: number;
  error: string;
  conflict: RemoteWorkspace | null;
  recoveryError: boolean;
  recoveryBlocked: boolean;
}
interface Storage {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
}
/** Revision-checked, serialized whole-workspace sync. A conflict never silently overwrites money. */
export class SyncEngine {
  private state: SyncSnapshot;
  private listeners = new Set<() => void>();
  private dirty = false;
  private busy = false;
  private disposed = false;
  private sequence = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private repo: Repository,
    initial: Workspace,
    private storage: Storage,
    private key: string,
  ) {
    this.state = {
      workspace: initial,
      revision: 0,
      ready: false,
      status: 'loading',
      generation: 0,
      error: '',
      conflict: null,
      recoveryError: false,
      recoveryBlocked: false,
    };
  }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private emit(patch: Partial<SyncSnapshot>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private cache() {
    try {
      if (this.dirty)
        this.storage.setItem(
          this.key,
          JSON.stringify({ workspace: this.state.workspace, revision: this.state.revision }),
        );
      else {
        this.storage.removeItem(this.key);
        this.storage.setItem(
          this.key + ':saved',
          JSON.stringify({ workspace: this.state.workspace, revision: this.state.revision }),
        );
      }
      this.emit({ recoveryError: false });
    } catch {
      this.emit({ recoveryError: true });
    }
  }
  start = async () => {
    try {
      const pending = this.storage.getItem(this.key),
        raw = pending ?? this.storage.getItem(this.key + ':saved');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!Number.isSafeInteger(parsed.revision) || parsed.revision < 0)
          throw new Error('Invalid recovery revision');
        const workspace = validateWorkspace(parsed.workspace);
        if (workspace.demo) throw new Error('Demo data cannot be synced');
        this.dirty = !!pending;
        this.emit({
          workspace,
          revision: parsed.revision,
          ready: true,
          status: pending ? 'pending' : 'loading',
        });
      }
    } catch {
      this.emit({
        recoveryError: true,
        recoveryBlocked: true,
        status: 'error',
        error: 'A local recovery file could not be read. It has not been removed.',
      });
      return;
    }
    await this.sync();
  };
  change = (workspace: Workspace) => {
    if (this.disposed) return;
    const validated = validateWorkspace(workspace);
    if (validated.demo) throw new Error('Use the separate demo workspace for sample data.');
    this.sequence++;
    this.dirty = true;
    this.emit({ workspace: validated, status: this.state.conflict ? 'conflict' : 'pending' });
    this.cache();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(), 500);
  };
  sync = async () => {
    if (this.disposed || this.busy || this.state.conflict || this.state.recoveryBlocked) return;
    this.busy = true;
    let saved = false;
    try {
      if (this.dirty) {
        const sequence = this.sequence;
        this.emit({ status: 'saving', error: '' });
        const result = await this.repo.save(this.state.workspace, this.state.revision);
        if (this.disposed) return;
        // An edit arriving during the request must remain queued, not be replaced by its response.
        if (sequence === this.sequence) this.dirty = false;
        this.emit({
          revision: result.revision,
          ready: true,
          status: this.dirty ? 'pending' : 'saved',
          error: '',
        });
        this.cache();
        saved = true;
      } else {
        const result = await this.repo.load();
        if (this.disposed) return;
        // User input can arrive while a refresh is in flight.
        if (this.dirty) {
          if (result && result.revision !== this.state.revision)
            this.emit({ conflict: result, status: 'conflict' });
          else saved = true;
        } else if (result) {
          const changed = result.revision !== this.state.revision;
          if (changed)
            this.emit({
              workspace: validateWorkspace(result.workspace),
              revision: result.revision,
              ready: true,
              status: 'saved',
              generation: this.state.generation + 1,
              error: '',
            });
          else this.emit({ status: 'saved', error: '' });
          if (changed || this.state.recoveryError) this.cache();
        } else if (this.state.revision === 0) {
          const created = await this.repo.save(this.state.workspace, 0);
          if (this.disposed) return;
          this.emit({
            workspace: created.workspace,
            revision: created.revision,
            ready: true,
            status: 'saved',
            error: '',
          });
          this.cache();
        } else throw new Error('The cloud workspace is unavailable. Your local state has been retained.');
      }
    } catch (error) {
      if (this.disposed) return;
      if (error instanceof SyncConflict) {
        try {
          const latest = await this.repo.load();
          if (this.disposed) return;
          if (!latest) throw new Error('Cloud workspace unavailable.');
          this.emit({ conflict: latest, status: 'conflict', ready: true, error: '' });
        } catch {
          this.emit({
            status: 'error',
            error: 'Could not load the conflicting cloud version. Retry when connected.',
          });
        }
      } else
        this.emit({
          status: this.state.ready ? 'offline' : 'error',
          error: error instanceof Error ? error.message : 'Could not reach the cloud. Retry when connected.',
        });
    } finally {
      this.busy = false;
      if (!this.disposed && this.dirty && saved && !this.state.conflict)
        this.timer = setTimeout(() => void this.sync(), 250);
    }
  };
  resolve = (choice: 'device' | 'cloud') => {
    const remote = this.state.conflict;
    if (!remote) return;
    if (choice === 'cloud') {
      this.dirty = false;
      this.sequence++;
      this.emit({
        workspace: remote.workspace,
        revision: remote.revision,
        conflict: null,
        status: 'saved',
        generation: this.state.generation + 1,
        error: '',
      });
      this.cache();
    } else {
      this.dirty = true;
      this.emit({ revision: remote.revision, conflict: null, status: 'pending', error: '' });
      this.cache();
      void this.sync();
    }
  };
  recoveryText = () => this.storage.getItem(this.key) ?? this.storage.getItem(this.key + ':saved');
  discardRecovery = async () => {
    try {
      this.storage.removeItem(this.key);
      this.storage.removeItem(this.key + ':saved');
      this.emit({ recoveryBlocked: false, recoveryError: false, error: '' });
      await this.sync();
    } catch {
      this.emit({ error: 'Recovery storage is blocked. Enable storage access before continuing.' });
    }
  };
  hasPending = () => this.dirty || this.state.recoveryBlocked;
  clearRecovery = () => {
    this.storage.removeItem(this.key);
    this.storage.removeItem(this.key + ':saved');
  };
  dispose = () => {
    this.disposed = true;
    clearTimeout(this.timer);
    this.listeners.clear();
  };
}
