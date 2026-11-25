import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { body, failure, HttpError, json, limit, sameOrigin } from "@/lib/server/http";
import { session, withSession } from "@/lib/server/session";
import { publicProfile } from "@/lib/server/profiles";
import { createPetSchema, isCatalogConfiguration } from "@/lib/validation/pet";
import { INITIAL_UNLOCK_STATE } from "@/config/pet";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const identity = session(request); limit(`create:${identity.ownerId}`, 12);
    const input = createPetSchema.parse(await body(request));
    if (!isCatalogConfiguration(input)) throw new HttpError(400, "CATALOG_MISMATCH", "品种与毛色不匹配");
    const pet = await db.userPetProfile.create({ data: { ...input, ownerId: identity.ownerId, shareCode: randomBytes(9).toString("base64url"), unlockState: { ...INITIAL_UNLOCK_STATE } } });
    return withSession(json({ pet: publicProfile(pet), canEdit: true, shareUrl: pet.isPublic ? new URL(`/p/${pet.shareCode}`, request.url).href : null }, 201), identity);
  } catch (error) { return failure(error); }
}
