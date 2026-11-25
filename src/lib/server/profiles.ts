import "server-only";
import type { UserPetProfile as DbProfile } from "@/generated/prisma/client";

export function publicProfile(p: DbProfile) {
  const { ownerId: _ownerId, ownerKind: _ownerKind, ...safe } = p;
  return safe;
}
