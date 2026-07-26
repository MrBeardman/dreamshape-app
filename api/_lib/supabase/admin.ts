import { createClient } from "@supabase/supabase-js";

// Dreamshape is a client-side SPA — the real Supabase session lives only in the
// browser's localStorage, never in a cookie a server can read. A remote MCP call has
// no session at all, so the tool server uses the service-role key to bypass RLS instead.
export function createAdminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Dreamshape is single-user; every table's rows are scoped by user_id, but there's no
// session to read it from remotely. There's exactly one profiles row, so just look it up.
export async function getUserId(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("id").limit(1).single();
  if (error || !data) throw new Error("Could not resolve the app's user id from the profiles table");
  return data.id as string;
}
