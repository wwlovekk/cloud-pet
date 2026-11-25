import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { body, failure, HttpError, json, limit, sameOrigin } from "@/lib/server/http";
import { session, withSession } from "@/lib/server/session";
import { publicProfile } from "@/lib/server/profiles";
import { isCatalogConfiguration, patchPetSchema } from "@/lib/validation/pet";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params, identity = session(request);
    const pet = await db.userPetProfile.findUnique({ where: { id } });
    if (!pet || (!pet.isPublic && pet.ownerId !== identity.ownerId)) throw new HttpError(404, "NOT_FOUND", "这只宠物还在自己的小窝里");
    return withSession(json({ pet: publicProfile(pet), canEdit: pet.ownerId === identity.ownerId, shareUrl: pet.isPublic ? new URL(`/p/${pet.shareCode}`, request.url).href : null }), identity);
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    sameOrigin(request); const { id } = await context.params, identity = session(request); limit(`edit:${identity.ownerId}`, 60);
    const { expectedVersion, ...changes } = patchPetSchema.parse(await body(request));
    const pet = await db.userPetProfile.findUnique({ where: { id } });
    if (!pet || pet.ownerId !== identity.ownerId) throw new HttpError(404, "NOT_FOUND", "找不到可编辑的宠物");
    if (!isCatalogConfiguration({ ...pet, ...changes })) throw new HttpError(400, "CATALOG_MISMATCH", "品种与毛色不匹配");
    const updated = await db.userPetProfile.updateMany({ where: { id, ownerId: identity.ownerId, version: expectedVersion }, data: { ...changes, version: { increment: 1 } } });
    if (!updated.count) throw new HttpError(409, "VERSION_CONFLICT", "配置已更新，请重新载入后保存");
    const result = await db.userPetProfile.findUniqueOrThrow({ where: { id } });
    return withSession(json({ pet: publicProfile(result), canEdit: true, shareUrl: result.isPublic ? new URL(`/p/${result.shareCode}`, request.url).href : null }), identity);
  } catch (error) { return failure(error); }
}
