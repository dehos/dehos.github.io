import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const clientSource = readFileSync(new URL("./supabase.js", import.meta.url), "utf8");
const exampleEnv = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");

test("browser Supabase client reads only URL and public anon-key Vite variables", () => {
  assert.match(clientSource, /import\.meta\.env\.VITE_SUPABASE_URL/);
  assert.match(clientSource, /import\.meta\.env\.VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(
    clientSource,
    /SERVICE_ROLE|service_role|SUPABASE_SECRET|SECRET_KEY/i,
    "A privileged or secret key must never be referenced by browser code.",
  );
  assert.doesNotMatch(exampleEnv, /SERVICE_ROLE_KEY\s*=/i);
});

test("missing Supabase public configuration fails closed without creating a client", () => {
  assert.match(
    clientSource,
    /supabaseUrl\s*&&\s*supabaseAnonKey\s*\?\s*createClient\(supabaseUrl,\s*supabaseAnonKey\)\s*:\s*null/s,
  );
  assert.match(clientSource, /isSupabaseConfigured\s*=\s*Boolean\(supabase\)/);
});

test("environment example explicitly warns against browser service-role keys", () => {
  assert.match(exampleEnv, /Never place a service_role key in frontend environment variables/i);
  assert.match(exampleEnv, /^VITE_SUPABASE_URL=/m);
  assert.match(exampleEnv, /^VITE_SUPABASE_ANON_KEY=/m);
});
