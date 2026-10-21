import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeWorkspace } from '../finance/model';
const db = new PGlite(),
  a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222';
beforeAll(async () => {
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; insert into auth.users values('${a}'),('${b}');`,
  );
  await db.exec(readFileSync('supabase/migrations/202610210001_workspaces.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
async function asUser(id: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
const save = (revision: number, demo = false) =>
  db.query<{ revision: number }>('select revision from public.save_workspace($1::jsonb,$2::bigint)', [
    JSON.stringify(makeWorkspace(demo)),
    revision,
  ]);
describe('PostgreSQL workspace authorization and atomic revision writes', () => {
  it('creates an own workspace and advances revision', async () => {
    await asUser(a);
    expect((await save(0)).rows[0].revision).toBe(1);
    expect((await save(1)).rows[0].revision).toBe(2);
  });
  it('rejects stale writes and duplicate initial creation', async () => {
    await asUser(a);
    await expect(save(1)).rejects.toMatchObject({ code: '40001' });
    await expect(save(0)).rejects.toMatchObject({ code: '40001' });
  });
  it('enforces cross-account read isolation and denies direct inserts, updates and deletes', async () => {
    await asUser(b);
    expect((await db.query('select * from public.workspaces')).rows).toHaveLength(0);
    await expect(
      db.exec(`update public.workspaces set revision=100 where user_id='${a}'`),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(db.exec(`delete from public.workspaces where user_id='${a}'`)).rejects.toMatchObject({
      code: '42501',
    });
    await expect(
      db.exec(`insert into public.workspaces(user_id,payload) values('${b}','{}')`),
    ).rejects.toMatchObject({ code: '42501' });
    expect((await save(0)).rows[0].revision).toBe(1);
    expect((await db.query('select user_id from public.workspaces')).rows).toEqual([{ user_id: b }]);
  });
  it('derives write ownership from verified auth rather than client input', async () => {
    await asUser(b);
    await save(1);
    await asUser(a);
    expect((await db.query('select revision from public.workspaces')).rows).toEqual([{ revision: 2 }]);
  });
  it('denies anonymous RPC and data access', async () => {
    await db.exec('reset role;set role anon;');
    await expect(save(0)).rejects.toMatchObject({ code: '42501' });
    await expect(db.query('select * from public.workspaces')).rejects.toMatchObject({ code: '42501' });
  });
  it('rejects demo payloads at the database boundary', async () => {
    await asUser(a);
    await expect(save(2, true)).rejects.toMatchObject({ code: '23514' });
  });
  it('cascades cloud workspace removal when its authenticated user is deleted', async () => {
    await db.exec(`reset role;delete from auth.users where id='${b}';`);
    expect((await db.query('select user_id from public.workspaces')).rows).toEqual([{ user_id: a }]);
  });
});
