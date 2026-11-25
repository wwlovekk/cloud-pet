import { z } from "zod";
import { BREEDS, BACKGROUNDS } from "@/config/catalog";
import type { PetConfiguration } from "@/types/pet";

const fields = {
  nickname: z.string().trim().min(1).max(24), species: z.enum(["cat", "dog"]), breedId: z.string().min(1).max(60), coatPatternId: z.string().min(1).max(100), backgroundSceneId: z.string().max(40).nullable(), size: z.number().min(.65).max(1.35), chubbiness: z.number().min(0).max(1), view: z.enum(["back", "belly"]), lighting: z.enum(["day", "night"]),
};
export const configurationSchema = z.object(fields).strict();
export const createPetSchema = z.object({ ...fields, isPublic: z.boolean().optional() }).strict();
export const patchPetSchema = z.object(fields).partial().extend({ expectedVersion: z.number().int().positive(), isPublic: z.boolean().optional() }).strict();
export function isCatalogConfiguration(c: PetConfiguration) {
  const breed = BREEDS.find(b => b.id === c.breedId && b.species === c.species);
  return !!breed?.coatPatterns.some(p => p.id === c.coatPatternId) && (c.backgroundSceneId === null || BACKGROUNDS.some(b => b.id === c.backgroundSceneId));
}
export const telemetrySchema = z.object({
  batchId: z.string().uuid(), sessionId: z.string().uuid(), sequence: z.number().int().min(0).max(1_000_000), petId: z.string().uuid().optional(), breedId: z.string().max(60), species: z.enum(["cat", "dog"]), view: z.enum(["back", "belly"]), durationMs: z.number().int().min(100).max(15_000), strokeCount: z.number().int().min(0).max(150), distanceNormalized: z.number().min(0).max(150), averageSpeed: z.number().min(0).max(10), regionCounts: z.record(z.string(), z.number().int().nonnegative().max(150)), clientStartedAt: z.string().datetime(), clientEndedAt: z.string().datetime(),
}).strict().superRefine((v, ctx) => {
  const regions = ["head", "chin", "neck", "spine", "rump", "chest", "belly", "front-paw", "hind-paw", "tail"];
  if (Object.keys(v.regionCounts).some(k => !regions.includes(k)) || Object.values(v.regionCounts).reduce((a, b) => a + b, 0) !== v.strokeCount) ctx.addIssue({ code: "custom", message: "部位计数不一致" });
  if (v.strokeCount > Math.ceil(v.durationMs / 100) + 1) ctx.addIssue({ code: "custom", message: "抚摸频率过高" });
  const span = Date.parse(v.clientEndedAt) - Date.parse(v.clientStartedAt);
  if (span < 0 || span > 20_000 || Math.abs(span - v.durationMs) > 2000) ctx.addIssue({ code: "custom", message: "抚摸时长不一致" });
});
