// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  isConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
      setSession: vi.fn(),
    },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("./lib/supabase.js", () => ({
  get isSupabaseConfigured() { return mocks.isConfigured; },
  get supabase() { return mocks.supabase; },
}));

import AuthGate from "./AuthGate.jsx";

function setAdminQuery(result) {
  mocks.supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(result),
    }),
  });
}

describe("AuthGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isConfigured = true;
    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mocks.supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.supabase.auth.signOut.mockResolvedValue({ error: null });
    setAdminQuery({ data: [{ email: "admin@example.test" }], error: null });
  });

  afterEach(() => cleanup());

  it("fails closed when Supabase is not configured", async () => {
    mocks.isConfigured = false;
    render(<AuthGate><div>Dashboard rahasia</div></AuthGate>);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Supabase belum dikonfigurasi",
    );
    expect(screen.queryByText("Dashboard rahasia")).not.toBeInTheDocument();
    expect(mocks.supabase.auth.getSession).not.toHaveBeenCalled();
  });

  it("shows the login form when no session exists", async () => {
    render(<AuthGate><div>Dashboard rahasia</div></AuthGate>);

    expect(await screen.findByLabelText("Username atau email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard rahasia")).not.toBeInTheDocument();
    expect(mocks.supabase.from).not.toHaveBeenCalled();
  });

  it("allows the dashboard only after an admin row is verified", async () => {
    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token", user: { id: "test-user" } } },
      error: null,
    });
    render(<AuthGate><div>Dashboard rahasia</div></AuthGate>);

    expect(await screen.findByText("Admin terverifikasi")).toBeInTheDocument();
    expect(screen.getByText("Dashboard rahasia")).toBeInTheDocument();
    expect(mocks.supabase.from).toHaveBeenCalledWith("app_admins");
  });

  it("denies access and signs out when the admin list is empty", async () => {
    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token", user: { id: "non-admin" } } },
      error: null,
    });
    setAdminQuery({ data: [], error: null });
    render(<AuthGate><div>Dashboard rahasia</div></AuthGate>);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Akun ini tidak memiliki izin admin",
    );
    await waitFor(() => expect(mocks.supabase.auth.signOut).toHaveBeenCalled());
    expect(screen.queryByText("Dashboard rahasia")).not.toBeInTheDocument();
  });

  it("denies access when admin permission cannot be verified", async () => {
    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token", user: { id: "unknown" } } },
      error: null,
    });
    setAdminQuery({ data: null, error: { message: "permission denied" } });
    render(<AuthGate><div>Dashboard rahasia</div></AuthGate>);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Akun ini tidak memiliki izin admin",
    );
    expect(screen.queryByText("Dashboard rahasia")).not.toBeInTheDocument();
  });
});
