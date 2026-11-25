import { db } from "@/lib/server/db";
import { json, failure } from "@/lib/server/http";
import { BREEDS } from "@/config/catalog";

export const runtime = "nodejs";
export async function GET() {
  try {
    const [global, ranking] = await Promise.all([db.pettingAggregate.findUnique({ where: { scope_subjectId: { scope: "global", subjectId: "all" } } }), db.pettingAggregate.findMany({ where: { scope: "breed" }, orderBy: { totalPettingCount: "desc" }, take: 8 })]);
    return json({ totalPettingCount: global?.totalPettingCount ?? 0n, totalDurationMs: global?.totalDurationMs ?? 0n, popularBreeds: ranking.map(r => ({ breedId: r.subjectId, name: BREEDS.find(b => b.id === r.subjectId)?.name, species: BREEDS.find(b => b.id === r.subjectId)?.species, totalPettingCount: r.totalPettingCount, totalDurationMs: r.totalDurationMs })), updatedAt: global?.updatedAt ?? new Date() }, 200, { "Cache-Control": "public, max-age=5" });
  } catch (error) { return failure(error); }
}
