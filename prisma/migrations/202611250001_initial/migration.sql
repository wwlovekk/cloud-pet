-- CreateTable
CREATE TABLE "SpeciesAndBreed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "species" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "skeletonParams" JSONB NOT NULL,
    "deformationWeights" JSONB NOT NULL,
    "proceduralAppearance" JSONB NOT NULL,
    "backAssetUrl" TEXT,
    "bellyAssetUrl" TEXT,
    "displacementMapUrl" TEXT,
    "audioPack" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CoatPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "breedId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "backTextureUrl" TEXT,
    "bellyTextureUrl" TEXT,
    "baseTone" TEXT NOT NULL,
    "proceduralPattern" JSONB NOT NULL,
    "viewAssets" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoatPattern_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "SpeciesAndBreed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackgroundScene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayAssetUrl" TEXT,
    "nightAssetUrl" TEXT,
    "nightLightingParams" JSONB NOT NULL,
    "dayLightingParams" JSONB NOT NULL,
    "ambientAudioUrl" TEXT,
    "proceduralMaterial" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserPetProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "ownerKind" TEXT NOT NULL DEFAULT 'anonymous',
    "nickname" TEXT NOT NULL DEFAULT '团子',
    "species" TEXT NOT NULL,
    "breedId" TEXT NOT NULL,
    "coatPatternId" TEXT NOT NULL,
    "backgroundSceneId" TEXT,
    "size" REAL NOT NULL DEFAULT 1.0 CHECK ("size" BETWEEN 0.65 AND 1.35),
    "chubbiness" REAL NOT NULL DEFAULT 0.5 CHECK ("chubbiness" BETWEEN 0 AND 1),
    "view" TEXT NOT NULL DEFAULT 'back',
    "lighting" TEXT NOT NULL DEFAULT 'day',
    "shareCode" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "totalPettingCount" BIGINT NOT NULL DEFAULT 0,
    "totalPettingDurationMs" BIGINT NOT NULL DEFAULT 0,
    "affectionPoints" INTEGER NOT NULL DEFAULT 0 CHECK ("affectionPoints" BETWEEN 0 AND 10000),
    "intimacyLevel" INTEGER NOT NULL DEFAULT 0,
    "unlockState" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" >= 1),
    "lastPettedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPetProfile_breedId_species_fkey" FOREIGN KEY ("breedId", "species") REFERENCES "SpeciesAndBreed" ("id", "species") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "UserPetProfile_coatPatternId_breedId_fkey" FOREIGN KEY ("coatPatternId", "breedId") REFERENCES "CoatPattern" ("id", "breedId") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "UserPetProfile_backgroundSceneId_fkey" FOREIGN KEY ("backgroundSceneId") REFERENCES "BackgroundScene" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PettingTelemetry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "petId" TEXT,
    "breedId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "view" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL CHECK ("durationMs" BETWEEN 100 AND 15000),
    "strokeCount" INTEGER NOT NULL CHECK ("strokeCount" BETWEEN 0 AND 150),
    "distanceNormalized" REAL NOT NULL CHECK ("distanceNormalized" BETWEEN 0 AND 150),
    "averageSpeed" REAL NOT NULL CHECK ("averageSpeed" BETWEEN 0 AND 10),
    "regionCounts" JSONB NOT NULL,
    "affectionEarned" INTEGER NOT NULL DEFAULT 0,
    "clientStartedAt" DATETIME NOT NULL,
    "clientEndedAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PettingTelemetry_petId_fkey" FOREIGN KEY ("petId") REFERENCES "UserPetProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PettingTelemetry_breedId_species_fkey" FOREIGN KEY ("breedId", "species") REFERENCES "SpeciesAndBreed" ("id", "species") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "PettingAggregate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalPettingCount" BIGINT NOT NULL DEFAULT 0,
    "totalDurationMs" BIGINT NOT NULL DEFAULT 0,
    "totalBatchCount" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesAndBreed_slug_key" ON "SpeciesAndBreed"("slug");

-- CreateIndex
CREATE INDEX "SpeciesAndBreed_species_enabled_sortOrder_idx" ON "SpeciesAndBreed"("species", "enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesAndBreed_id_species_key" ON "SpeciesAndBreed"("id", "species");

-- CreateIndex
CREATE INDEX "CoatPattern_breedId_enabled_sortOrder_idx" ON "CoatPattern"("breedId", "enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CoatPattern_breedId_slug_key" ON "CoatPattern"("breedId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CoatPattern_id_breedId_key" ON "CoatPattern"("id", "breedId");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundScene_slug_key" ON "BackgroundScene"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserPetProfile_shareCode_key" ON "UserPetProfile"("shareCode");

-- CreateIndex
CREATE INDEX "UserPetProfile_ownerId_ownerKind_updatedAt_idx" ON "UserPetProfile"("ownerId", "ownerKind", "updatedAt");

-- CreateIndex
CREATE INDEX "UserPetProfile_breedId_idx" ON "UserPetProfile"("breedId");

-- CreateIndex
CREATE INDEX "UserPetProfile_coatPatternId_breedId_idx" ON "UserPetProfile"("coatPatternId", "breedId");

-- CreateIndex
CREATE INDEX "UserPetProfile_backgroundSceneId_idx" ON "UserPetProfile"("backgroundSceneId");

-- CreateIndex
CREATE INDEX "PettingTelemetry_petId_receivedAt_idx" ON "PettingTelemetry"("petId", "receivedAt");

-- CreateIndex
CREATE INDEX "PettingTelemetry_ownerId_receivedAt_idx" ON "PettingTelemetry"("ownerId", "receivedAt");

-- CreateIndex
CREATE INDEX "PettingTelemetry_breedId_receivedAt_idx" ON "PettingTelemetry"("breedId", "receivedAt");

-- CreateIndex
CREATE INDEX "PettingTelemetry_receivedAt_idx" ON "PettingTelemetry"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PettingTelemetry_ownerId_batchId_key" ON "PettingTelemetry"("ownerId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "PettingTelemetry_ownerId_sessionId_sequence_key" ON "PettingTelemetry"("ownerId", "sessionId", "sequence");

-- CreateIndex
CREATE INDEX "PettingAggregate_scope_totalPettingCount_idx" ON "PettingAggregate"("scope", "totalPettingCount");

-- CreateIndex
CREATE UNIQUE INDEX "PettingAggregate_scope_subjectId_key" ON "PettingAggregate"("scope", "subjectId");
