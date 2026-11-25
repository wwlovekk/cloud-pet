import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseUrl } from "../../../config/database";

const globals = globalThis as unknown as { petDatabase?: PrismaClient };
export const db = globals.petDatabase ?? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: resolveDatabaseUrl(process.env.DATABASE_URL) }) });
if (process.env.NODE_ENV !== "production") globals.petDatabase = db;
