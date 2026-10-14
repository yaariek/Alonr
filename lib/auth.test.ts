import { describe, expect, it, vi } from "vitest";
import { isTesterEmail, isUniEmail, NOT_A_UNI_EMAIL, startSignIn, verifyCode } from "@/lib/auth";

// Minimal fake of supabase.auth: each method resolves with { error } (null = success)
function fakeSupabase(errors: Partial<Record<"otp" | "password" | "verify", string>> = {}) {
  const res = (key: keyof typeof errors) => Promise.resolve({ error: errors[key] ? { message: errors[key] } : null });
  const auth = {
    signInWithOtp: vi.fn(() => res("otp")),
    signInWithPassword: vi.fn(() => res("password")),
    verifyOtp: vi.fn(() => res("verify")),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { auth } as any, auth };
}

describe("email checks", () => {
  it("recognises tester and uni emails", () => {
    expect(isTesterEmail(" Judge@Demo.ac.uk ")).toBe(true);
    expect(isTesterEmail("someone@ucl.ac.uk")).toBe(false);
    expect(isUniEmail("someone@live.kcl.ac.uk")).toBe(true);
    expect(isUniEmail("someone@gmail.com")).toBe(false);
  });
});

describe("startSignIn", () => {
  it("never sends an email for testers", async () => {
    const { client, auth } = fakeSupabase();
    expect(await startSignIn(client, "judge@demo.ac.uk")).toEqual({ step: "code", tester: true });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends a sign-in email to real students", async () => {
    const { client, auth } = fakeSupabase();
    expect(await startSignIn(client, "Student@UCL.ac.uk")).toEqual({ step: "check-email", tester: false });
    expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: "student@ucl.ac.uk" }));
  });

  it("rejects non-uni emails without calling Supabase", async () => {
    const { client, auth } = fakeSupabase();
    expect(await startSignIn(client, "someone@gmail.com")).toEqual({ step: "error", message: NOT_A_UNI_EMAIL });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("turns the database's sign-up rejection into the friendly message", async () => {
    const { client } = fakeSupabase({ otp: "Database error saving new user" });
    expect(await startSignIn(client, "x@unknown.ac.uk")).toEqual({ step: "error", message: NOT_A_UNI_EMAIL });
  });
});

describe("verifyCode", () => {
  it("testers log in with the code as their password", async () => {
    const { client, auth } = fakeSupabase();
    expect(await verifyCode(client, "tom@demo.ac.uk", " 20261016 ")).toEqual({ ok: true });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "tom@demo.ac.uk", password: "20261016" });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("real students verify the emailed code", async () => {
    const { client, auth } = fakeSupabase();
    await verifyCode(client, "student@ucl.ac.uk", "123456");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "student@ucl.ac.uk", token: "123456", type: "email" });
  });

  it("a wrong code gives a clear message", async () => {
    const { client } = fakeSupabase({ password: "Invalid login credentials" });
    expect(await verifyCode(client, "judge@demo.ac.uk", "000000")).toEqual({
      ok: false,
      message: "That code didn't work. Check it and try again.",
    });
  });
});
