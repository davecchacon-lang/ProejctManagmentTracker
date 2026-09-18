import { getDb } from "@/db";
import { tasks } from "@/db/schema";
import { requireUser } from "@/lib/access";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  try {
    const identity = await requireUser();
    const p = (await request.json()) as Record<string, unknown>;
    if (!String(p.title ?? "").trim()) return Response.json({ error: "Title is required" }, { status: 400 });
    const db = await getDb();
    const [task] = await db
      .insert(tasks)
      .values({
        title: String(p.title),
        project: String(p.project ?? ""),
        owner: String(p.owner ?? "Unassigned"),
        due: String(p.due ?? "Not set"),
        status: "open",
        impact: Number(p.impact ?? 0),
      })
      .returning();
    await logActivity("created", "task", task.title, identity.name);
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Task could not be saved." }, { status: 500 });
  }
}
