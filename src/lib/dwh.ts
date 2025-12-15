import { env } from "@/config/env";

type DwhClient = {
  execute: (sql: string, params?: any[]) => Promise<void>;
  bulkInsert: (table: string, rows: Record<string, any>[]) => Promise<void>;
};

// Placeholder DWH client. Replace with Snowflake/BigQuery SDK as needed.
class DummyDwhClient implements DwhClient {
  async execute(sql: string) {
    console.log("DWH execute", sql.slice(0, 80));
  }
  async bulkInsert(table: string, rows: Record<string, any>[]) {
    console.log(`DWH bulk insert ${table} rows=${rows.length}`);
  }
}

export function getDwhClient(): DwhClient | null {
  if (!env.DWH_EXPORT_ENABLED) return null;
  // Choose client based on env.DWH_TYPE
  return new DummyDwhClient();
}
