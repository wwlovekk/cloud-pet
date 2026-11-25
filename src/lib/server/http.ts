import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(JSON.parse(JSON.stringify({ ok: true, data }, (_, value) => typeof value === "bigint" ? value.toString() : value)), { status, headers });
}
export function failure(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "请检查提交的配置", fields: error.flatten().fieldErrors } }, { status: 400 });
  if (error instanceof HttpError) return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: error.status });
  console.error("Pet API error", error);
  return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "暂时没能完成，请稍后重试" } }, { status: 500 });
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) throw new HttpError(413, "VALIDATION_ERROR", "请求过大");
  const value = await request.text();
  if (value.length > 16_384) throw new HttpError(413, "VALIDATION_ERROR", "请求过大");
  try { return JSON.parse(value); } catch { throw new HttpError(400, "VALIDATION_ERROR", "JSON 格式不正确"); }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  let matches = !origin;
  try { if (origin) { const parsed = new URL(origin); matches = (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.host === host; } } catch { matches = false; }
  if (!matches || request.headers.get("sec-fetch-site") === "cross-site") {
    if (process.env.NODE_ENV !== "production") console.warn("Rejected request origin", { origin, host, requestOrigin: new URL(request.url).origin, site: request.headers.get("sec-fetch-site") });
    throw new HttpError(403, "FORBIDDEN", "请从本站发起操作");
  }
}
const buckets = new Map<string, { count: number; until: number }>();
export function limit(key: string, max = 30) {
  const now = Date.now();
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.until < now) buckets.delete(k);
  const current = buckets.get(key);
  if (!current || current.until < now) { buckets.set(key, { count: 1, until: now + 60_000 }); return; }
  if (++current.count > max) throw new HttpError(429, "RATE_LIMITED", "稍等片刻，再轻轻试一次");
}
