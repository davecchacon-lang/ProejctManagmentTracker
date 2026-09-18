import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/access";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  try {
    const identity = await requireUser();
    const p = (await request.json()) as Record<string, unknown>;
    if (!String(p.name ?? "").trim()) return Response.json({ error: "Project name is required" }, { status: 400 });
    const db = await getDb();
    const [project] = await db
      .insert(projects)
      .values({
        name: String(p.name),
        description: String(p.description ?? ""),
        category: String(p.category ?? "Operations"),
        owner: String(p.owner ?? "Unassigned"),
        status: "On track",
        due: String(p.due ?? "Not set"),
        color: "#5b6fd8",
        progress: 0,
        priority: String(p.priority ?? "Normal"),
      })
      .returning();
    await logActivity("created", "project", project.name, identity.name);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Project could not be saved." }, { status: 500 });
  }
}
