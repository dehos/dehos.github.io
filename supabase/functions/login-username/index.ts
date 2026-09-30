import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const projectUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const allowedOrigin = "https://dehos.github.io";

const admin = createClient(projectUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function headers(origin: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    ...(origin === allowedOrigin ? {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    } : {}),
  };
}

function response(error: string, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify({ error }), { status, headers });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const responseHeaders = headers(origin);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders });
  }
  if (request.method !== "POST") return response("Metode tidak didukung.", 405, responseHeaders);
  if (origin && origin !== allowedOrigin) {
    return response("Asal permintaan tidak diizinkan.", 403, responseHeaders);
  }

  try {
    const raw = await request.text();
    if (raw.length > 1024) return response("Username atau password salah.", 401, responseHeaders);
    const input = JSON.parse(raw);
    const username = String(input?.username || "").trim().toLowerCase();
    const password = input?.password;
    if (!/^[a-z0-9]{2,32}$/.test(username) ||
        typeof password !== "string" || password.length < 8 ||
        password.length > 256) {
      return response("Username atau password salah.", 401, responseHeaders);
    }

    const { data: aliases, error: lookupError } = await admin
      .from("app_admins")
      .select("email")
      .ilike("username", username)
      .limit(1);
    if (lookupError) throw lookupError;
    const email = aliases?.[0]?.email;
    if (!email) return response("Username atau password salah.", 401, responseHeaders);

    // Count attempts atomically per username before checking the password.
    const { data: allowed, error: rateError } = await admin
      .rpc("check_username_login_rate", { p_username: username });
    if (rateError) throw rateError;
    if (!allowed) return response("Terlalu banyak percobaan. Coba lagi dalam 15 menit.", 429, responseHeaders);

    const auth = createClient(projectUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return response("Username atau password salah.", 401, responseHeaders);
    }
    await admin.from("app_login_attempts").delete().eq("username", username);
    return new Response(JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }), { status: 200, headers: responseHeaders });
  } catch (_error) {
    return response("Login belum bisa diproses.", 500, responseHeaders);
  }
});
