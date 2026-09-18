import { getDb } from "@/db";
import { tickets } from "@/db/schema";
import { requireUser } from "@/lib/access";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  try {
    const identity = await requireUser();
    const p = (await request.json()) as Record<string, unknown>;
    if (!String(p.title ?? "").trim()) return Response.json({ error: "Title is required" }, { status: 400 });
    const db = await getDb();
    const [ticket] = await db
      .insert(tickets)
      .values({
        kind: String(p.kind ?? "request"),
        title: String(p.title).trim(),
        description: String(p.description ?? ""),
        priority: String(p.priority ?? "Normal"),
        status: "New",
        requester: identity.name,
        owner: "Unassigned",
        created: "Today",
      })
      .returning();
    await logActivity("created", "ticket", ticket.title, identity.name);
    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Ticket could not be created." }, { status: 500 });
  }
}
