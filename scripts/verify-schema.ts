import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

// Exercise generated SQL, not just Prisma's schema parser. No files or DB server required.
const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [
  require.resolve("prisma/build/index.js"), "migrate", "diff", "--from-empty",
  "--to-schema", "prisma/schema.prisma", "--script",
], { cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8" });

if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr);
assert.match(result.stdout, /CREATE TABLE/);

const db = new DatabaseSync(":memory:");
try {
  db.exec(result.stdout);
  db.exec("PRAGMA foreign_keys = ON");
  const breed = db.prepare(`INSERT INTO SpeciesAndBreed
    (id,species,slug,name,skeletonParams,deformationWeights,proceduralAppearance,audioPack,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  breed.run("cat-breed", "cat", "domestic-shorthair", "cat", "{}", "{}", "{}", "{}", Date.now());
  breed.run("dog-breed", "dog", "shiba-inu", "dog", "{}", "{}", "{}", "{}", Date.now());
  const coat = db.prepare(`INSERT INTO CoatPattern
    (id,breedId,slug,name,baseTone,proceduralPattern,viewAssets,updatedAt) VALUES (?,?,?,?,?,?,?,?)`);
  coat.run("cat-coat", "cat-breed", "black", "black", "#111111", "{}", "{}", Date.now());
  coat.run("dog-coat", "dog-breed", "red", "red", "#bb7744", "{}", "{}", Date.now());
  const profile = db.prepare(`INSERT INTO UserPetProfile
    (id,ownerId,species,breedId,coatPatternId,shareCode,unlockState,updatedAt) VALUES (?,?,?,?,?,?,?,?)`);
  profile.run("valid", "owner", "cat", "cat-breed", "cat-coat", "valid-share", '{"belly":false}', Date.now());
  assert.throws(() => profile.run("bad-species", "owner", "dog", "cat-breed", "cat-coat", "share-2", "{}", Date.now()), /FOREIGN KEY/);
  assert.throws(() => profile.run("bad-coat", "owner", "cat", "cat-breed", "dog-coat", "share-3", "{}", Date.now()), /FOREIGN KEY/);

  const event = db.prepare(`INSERT INTO PettingTelemetry
    (id,ownerId,batchId,sessionId,sequence,breedId,species,view,durationMs,strokeCount,
      distanceNormalized,averageSpeed,regionCounts,clientStartedAt,clientEndedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const append = (id: string, batch: string, session: string, sequence: number) => event.run(
    id, "owner", batch, session, sequence, "cat-breed", "cat", "back", 1000, 2, 0.2, 0.2,
    "{}", Date.now() - 1000, Date.now(),
  );
  append("event-1", "batch-1", "session-1", 0);
  assert.throws(() => append("event-2", "batch-1", "session-2", 1), /UNIQUE/);
  assert.throws(() => append("event-3", "batch-2", "session-1", 0), /UNIQUE/);
  const aggregate = db.prepare("INSERT INTO PettingAggregate (id,scope,subjectId,updatedAt) VALUES (?,?,?,?)");
  aggregate.run("global-1", "global", "all", Date.now());
  assert.throws(() => aggregate.run("global-2", "global", "all", Date.now()), /UNIQUE/);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  console.log("PASS: six tables created; valid profile accepted; species/coat mismatches and duplicate batches/aggregates rejected.");
} finally {
  db.close();
}
