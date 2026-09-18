import { getDb } from "@/db";
import { activityLog } from "@/db/schema";

export type ActivityAction = "created" | "deleted";
export type ActivityEntityType = "project" | "task" | "step" | "ticket";

// Best-effort audit trail. A logging failure should never break the actual
// create/delete the user asked for, so errors are swallowed here.
export async function logActivity(action: ActivityAction, entityType: ActivityEntityType, entityName: string, actor: string) {
  try {
    const db = await getDb();
    await db.insert(activityLog).values({ action, entityType, entityName, actor, createdAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
  }
}

