import { db } from "./schema";

const BACKUP_VERSION = 1;

/** Dumps every table via Dexie's own `db.tables` — covers every current and future table
 * without needing to list them by name. */
export async function exportAllData(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }
  return JSON.stringify({ version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
}

/** Replaces every table's contents with the backup's. Validates the file's shape before
 * touching anything, so a bad/corrupt file never partially wipes real data. */
export async function importAllData(json: string): Promise<void> {
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || typeof (parsed as { data?: unknown }).data !== "object") {
    throw new Error("Not a valid backup file.");
  }
  const data = (parsed as { data: Record<string, unknown> }).data;

  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
      const rows = data[table.name];
      if (Array.isArray(rows) && rows.length > 0) await table.bulkAdd(rows);
    }
  });
}
