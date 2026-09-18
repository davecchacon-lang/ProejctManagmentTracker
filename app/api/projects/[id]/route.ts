import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, projectSteps } from "@/db/schema";
import { requireUser } from "@/lib/access";
import { logActivity } from "@/lib/activity";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const p = (await request.json()) as Record<string, unknown>;
    const changes: Record<string, unknown> = {};
    for (const key of ["name", "description", "category", "owner", "status", "due", "color", "priority"] as const) if (typeof p[key] === "string") changes[key] = p[key];
    if (Number.isFinite(Number(p.progress))) changes.progress = Math.max(0, Math.min(100, Number(p.progress)));
    const [project] = await (await getDb()).update(projects).set(changes).where(eq(projects.id, Number(id))).returning();
    return project ? Response.json({ project }) : Response.json({ error: "Project not found." }, { status: 404 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Project could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireUser();
    const { id } = await params;
    const db = await getDb();
    const [project] = await db.select().from(projects).where(eq(projects.id, Number(id))).limit(1);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    // No ON DELETE CASCADE on project_steps, so clear its steps first.
    await db.delete(projectSteps).where(eq(projectSteps.projectId, Number(id)));
    await db.delete(projects).where(eq(projects.id, Number(id)));
    await logActivity("deleted", "project", project.name, identity.name);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Project could not be deleted." }, { status: 500 });
  }
}
