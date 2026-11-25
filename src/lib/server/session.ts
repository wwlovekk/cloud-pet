import "server-only";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const globalSecrets = globalThis as unknown as { petSessionSecret?: string };
function secret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must contain at least 32 characters");
  return globalSecrets.petSessionSecret ??= randomBytes(32).toString("hex");
}
const signature = (id: string) => createHmac("sha256", secret()).update(id).digest("base64url");
export function session(request: NextRequest) {
  const token = request.cookies.get("cloud-pet-session")?.value;
  if (token) {
    const [id, sig] = token.split(".");
    if (id && sig && /^[a-f0-9-]{36}$/.test(id)) {
      const expected = signature(id);
      if (sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return { ownerId: id, fresh: false };
    }
  }
  return { ownerId: randomUUID(), fresh: true };
}
export function withSession(response: NextResponse, identity: ReturnType<typeof session>) {
  if (identity.fresh) response.cookies.set("cloud-pet-session", `${identity.ownerId}.${signature(identity.ownerId)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
