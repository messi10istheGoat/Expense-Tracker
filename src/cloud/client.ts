import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { validateWorkspace, type Workspace } from '../finance/model';
import { SyncConflict, type Repository, type RemoteWorkspace } from './sync';
const env = import.meta.env;
const url = env.VITE_SUPABASE_URL as string | undefined;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const cloudConfigured = !!url && !!key;
export const supabase = cloudConfigured
  ? createClient(url!, key!, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !Capacitor.isNativePlatform(),
      },
    })
  : null;
export const authRedirect = () =>
  Capacitor.isNativePlatform()
    ? 'spendwise://auth-callback'
    : new URL(import.meta.env.BASE_URL, location.href).href;
function record(row: { payload: unknown; revision: number }): RemoteWorkspace {
  if (!Number.isSafeInteger(row.revision) || row.revision < 1) throw new Error('Invalid cloud revision.');
  const workspace = validateWorkspace(row.payload);
  if (workspace.demo) throw new Error('Unexpected demo data in this cloud workspace.');
  return { workspace, revision: row.revision };
}
export function repository(userId: string): Repository {
  if (!supabase) throw new Error('Cloud service is not configured.');
  const client = supabase;
  let last: RemoteWorkspace | null = null;
  return {
    async load() {
      // Poll a small revision record rather than downloading an unchanged financial snapshot.
      if (last) {
        const { data, error } = await client
          .from('workspaces')
          .select('revision')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw new Error('Could not check for cloud changes.');
        if (data?.revision === last.revision) return last;
        if (!data) return null;
      }
      const { data, error } = await client
        .from('workspaces')
        .select('payload,revision')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error('Could not load your cloud workspace. Check your connection and sign-in.');
      last = data ? record(data) : null;
      return last;
    },
    async save(workspace: Workspace, revision: number) {
      const { data, error } = await client.rpc('save_workspace', {
        p_payload: workspace,
        p_expected_revision: revision,
      });
      if (error) {
        if (error.code === '40001') throw new SyncConflict();
        throw new Error('Changes have not synced. Check your connection or sign in again.');
      }
      if (!Array.isArray(data) || !data[0]) throw new Error('No cloud acknowledgement received.');
      last = record(data[0]);
      return last;
    },
  };
}
