import { createHash } from "node:crypto";
import { CATALOG } from "@/config/catalog";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";
const etag = `"${createHash("sha256").update(JSON.stringify(CATALOG)).digest("hex").slice(0, 20)}"`;
export function GET(request: Request) {
  const headers = { ETag: etag, "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" };
  return request.headers.get("if-none-match") === etag ? new Response(null, { status: 304, headers }) : json(CATALOG, 200, headers);
}
