import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { activityLog } from "@/db/schema";
import { requireUser } from "@/lib/access";

export async function GET() {
  try {
    await requireUser();
    const db = await getDb();
    const activity = await db.select().from(activityLog).orderBy(desc(activityLog.id)).limit(200);
    return Response.json({ activity });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Activity log is temporarily unavailable." }, { status: 503 });
  }
}

