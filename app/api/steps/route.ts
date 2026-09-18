import { getDb } from "@/db";
import { projectSteps } from "@/db/schema";
import { requireUser } from "@/lib/access";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  try {
    const identity = await requireUser();
    const p = (await request.json()) as Record<string, unknown>;
    if (!p.projectId || !String(p.title ?? "").trim()) return Response.json({ error: "Project and step title are required" }, { status: 400 });
    const db = await getDb();
    const [step] = await db
      .insert(projectSteps)
      .values({
        projectId: Number(p.projectId),
        title: String(p.title).trim(),
        assignee: String(p.assignee ?? "Unassigned"),
        due: String(p.due ?? "Not set"),
        status: "todo",
        position: Number(p.position ?? 0),
      })
      .returning();
    await logActivity("created", "step", step.title, identity.name);
    return Response.json({ step }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Step could not be added." }, { status: 500 });
  }
}
