import "dotenv/config";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { resolveDatabaseUrl } from "../config/database";
import { BREEDS, BACKGROUNDS } from "../src/config/catalog";

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: resolveDatabaseUrl(process.env.DATABASE_URL) }) });
const asJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v));
try {
  for (const b of BREEDS) {
    const { coatPatterns, ...breed } = b;
    const data = { ...breed, skeletonParams: asJson(b.skeletonParams), deformationWeights: asJson(b.deformationWeights), proceduralAppearance: asJson(b.proceduralAppearance), audioPack: asJson(b.audioPack) };
    await db.speciesAndBreed.upsert({ where: { id: b.id }, create: data, update: data });
    for (const coat of coatPatterns) {
      const data = { ...coat, proceduralPattern: asJson(coat.proceduralPattern), viewAssets: asJson(coat.viewAssets) };
      await db.coatPattern.upsert({ where: { id: coat.id }, create: data, update: data });
    }
  }
  for (const scene of BACKGROUNDS) {
    const data = { ...scene, dayLightingParams: asJson(scene.dayLightingParams), nightLightingParams: asJson(scene.nightLightingParams), proceduralMaterial: asJson(scene.proceduralMaterial) };
    await db.backgroundScene.upsert({ where: { id: scene.id }, create: data, update: data });
  }
  await db.pettingAggregate.upsert({ where: { scope_subjectId: { scope: "global", subjectId: "all" } }, create: { scope: "global", subjectId: "all" }, update: {} });
  let env = existsSync(".env") ? readFileSync(".env", "utf8") : readFileSync(".env.example", "utf8");
  if (!/^SESSION_SECRET="?[^"\r\n]{32,}/m.test(env)) {
    env = env.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET="${randomBytes(32).toString("hex")}"`);
    writeFileSync(".env", env);
  }
  console.log(`Seeded ${BREEDS.length} breeds, ${BREEDS.reduce((n, b) => n + b.coatPatterns.length, 0)} coats and ${BACKGROUNDS.length} backgrounds.`);
} finally { await db.$disconnect(); }
