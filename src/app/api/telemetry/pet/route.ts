import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { Prisma } from "@/generated/prisma/client";
import { body, failure, HttpError, json, limit, sameOrigin } from "@/lib/server/http";
import { session, withSession } from "@/lib/server/session";
import { telemetrySchema } from "@/lib/validation/pet";
import { BREEDS } from "@/config/catalog";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request); const identity = session(request); limit(`pet:${identity.ownerId}`, 45);
    const input = telemetrySchema.parse(await body(request));
    if (!BREEDS.some(b => b.id === input.breedId && b.species === input.species)) throw new HttpError(400, "CATALOG_MISMATCH", "品种不存在");
    let profile: unknown = null;
    const earned = Math.min(80, Math.floor(input.durationMs / 300) + input.strokeCount);
    let accepted = true;
    try {
      await db.$transaction(async tx => {
        const pet = input.petId ? await tx.userPetProfile.findFirst({ where: { id: input.petId, ownerId: identity.ownerId, breedId: input.breedId } }) : null;
        if (input.petId && !pet) throw new HttpError(404, "NOT_FOUND", "找不到当前宠物");
        await tx.pettingTelemetry.create({ data: { ...input, ownerId: identity.ownerId, clientStartedAt: new Date(input.clientStartedAt), clientEndedAt: new Date(input.clientEndedAt), affectionEarned: earned } });
        for (const [scope, subjectId] of [["global", "all"], ["owner", identity.ownerId], ["breed", input.breedId]] as const) {
          await tx.pettingAggregate.upsert({ where: { scope_subjectId: { scope, subjectId } }, create: { scope, subjectId, totalPettingCount: BigInt(input.strokeCount), totalDurationMs: BigInt(input.durationMs), totalBatchCount: 1n }, update: { totalPettingCount: { increment: BigInt(input.strokeCount) }, totalDurationMs: { increment: BigInt(input.durationMs) }, totalBatchCount: { increment: 1n } } });
        }
        if (pet) {
          const points = Math.min(10_000, pet.affectionPoints + earned);
          const updated = await tx.userPetProfile.update({ where: { id: pet.id }, data: { totalPettingCount: { increment: BigInt(input.strokeCount) }, totalPettingDurationMs: { increment: BigInt(input.durationMs) }, affectionPoints: points, intimacyLevel: Math.floor(points / 600), unlockState: { ...(pet.unlockState as object), belly: points >= 600 }, lastPettedAt: new Date() } });
          profile = { id: updated.id, affectionPoints: updated.affectionPoints, intimacyLevel: updated.intimacyLevel, unlockState: updated.unlockState, totalPettingCount: updated.totalPettingCount };
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") accepted = false; else throw error;
    }
    const total = await db.pettingAggregate.findUnique({ where: { scope_subjectId: { scope: "global", subjectId: "all" } } });
    return withSession(json({ batchId: input.batchId, accepted, affectionEarned: accepted ? earned : 0, profile, globalPettingCount: total?.totalPettingCount ?? 0n }), identity);
  } catch (error) { return failure(error); }
}
