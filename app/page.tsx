"use client";

import { useEffect, useState } from "react";
import { getUser, handleAuthCallback, login, logout, signup, type User } from "@netlify/identity";
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, FolderKanban, Gauge, History, ListChecks, Plus, Search, Settings2, Sparkles, Tag, TicketCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type Project = { id: number; name: string; description: string; category: string; owner: string; status: string; due: string; color: string; progress: number; priority: string };
type Step = { id: number; projectId: number; title: string; status: string; assignee: string; due: string; position: number };
type Task = { id: number; title: string; project: string; owner: string; due: string; status: string; impact: number };
type Ticket = { id: number; kind: "request" | "issue" | "idea"; title: string; description: string; priority: string; status: string; requester: string; owner: string; created: string };
type TicketKind = "request" | "issue" | "idea";
type ActivityEntry = { id: number; action: string; entityType: string; entityName: string; actor: string; createdAt: string };

const nav: [string, string, React.ElementType][] = [
  ["dashboard", "Dashboard", Gauge],
  ["my-work", "My work", ListChecks],
  ["projects", "Projects", FolderKanban],
  ["calendar", "Calendar", CalendarDays],
  ["tickets", "Tickets", TicketCheck],
  ["activity", "Activity", History],
];

const statusColor: Record<string, string> = { "On track": "#2c8b74", Watch: "#d39a38", "At risk": "#d05d59" };
const kindLabel: Record<TicketKind, string> = { request: "Request", issue: "Issue", idea: "Idea" };
const kindPrefix: Record<TicketKind, string> = { request: "REQ-", issue: "ISS-", idea: "IDA-" };

export default function Home() {
  const [identity, setIdentity] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    handleAuthCallback().then((result) => result?.user ?? getUser()).then((user) => { setIdentity(user); setReady(true); });
  }, []);
  if (!ready) return <main className="auth-shell"><section className="auth-card"><div className="brand-mark" aria-hidden="true">👋</div><h1>Opening Signal</h1><p>Checking your workspace access…</p></section></main>;
  if (!identity) return <IdentityGate onSignedIn={setIdentity} />;
  return <WorkspaceApp identity={identity} />;
}

function IdentityGate({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        await signup(email.trim().toLowerCase(), password, { data: { full_name: email.split("@")[0] } });
        setMessage("Check your email to confirm the account, then sign in."); setMode("login"); setPassword("");
      } else onSignedIn(await login(email.trim().toLowerCase(), password));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally { setBusy(false); }
  }
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark" aria-hidden="true">👋</div>
        <span>Signal Project Manager</span>
        <h1>{mode === "login" ? "Sign in to your workspace" : "Create your account"}</h1>
        <p>Sign in or create an account to get started.</p>
        <div className="form-stack">
          <label>Email address<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label>Password<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          {message && <div className="auth-message">{message}</div>}
          <Button onClick={submit} disabled={busy || !email.includes("@") || password.length < 8}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
        </div>
        <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
          {mode === "login" ? "First time here? Create an account" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}

function WorkspaceApp({ identity }: { identity: User }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Project | null>(null);
  const [ticketKind, setTicketKind] = useState<TicketKind>("request");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  const [projectForm, setProjectForm] = useState({ name: "", description: "", owner: "", due: "" });
  const [taskForm, setTaskForm] = useState({ title: "", project: "", owner: "", due: "" });
  const [stepForm, setStepForm] = useState({ title: "", assignee: "", due: "" });
  const [ticketForm, setTicketForm] = useState({ title: "", description: "", priority: "Normal" });

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) { toast.error("Could not load workspace data. Try refreshing."); setLoaded(true); return; }
        setProjects(d.projects || []); setSteps(d.steps || []); setTasks(d.tasks || []); setTickets(d.tickets || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (view !== "activity") return;
    fetch("/api/activity")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setActivity(d?.activity || []))
      .catch(() => undefined);
  }, [view]);

  const filteredProjects = projects.filter((p) => (p.name + p.category + p.owner).toLowerCase().includes(query.toLowerCase()));
  const openTasks = tasks.filter((t) => t.status !== "done").sort((a, b) => b.impact - a.impact);
  const doneTasks = tasks.filter((t) => t.status === "done");
  const attentionProjects = projects.filter((p) => p.status !== "On track");
  const kindTickets = tickets.filter((t) => t.kind === ticketKind);
  const openTickets = tickets.filter((t) => t.status !== "Converted" && t.status !== "Done");
  const healthData = ["On track", "Watch", "At risk"].map((name) => ({ name, value: projects.filter((p) => p.status === name).length, color: statusColor[name] }));

  function toggleTask(task: Task) {
    const status = task.status === "done" ? "open" : "done";
    setTasks((x) => x.map((t) => (t.id === task.id ? { ...t, status } : t)));
    fetch("/api/tasks/" + task.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }).catch(() => undefined);
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    const r = await fetch("/api/tasks/" + task.id, { method: "DELETE" });
    if (r.ok) { setTasks((x) => x.filter((t) => t.id !== task.id)); toast("Task deleted"); }
    else toast.error("Could not delete task");
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete "${project.name}" and all its steps? This can't be undone.`)) return;
    const r = await fetch("/api/projects/" + project.id, { method: "DELETE" });
    if (r.ok) {
      setProjects((x) => x.filter((p) => p.id !== project.id));
      setSteps((x) => x.filter((s) => s.projectId !== project.id));
      setSelected((s) => (s && s.id === project.id ? null : s));
      toast("Project deleted");
    } else toast.error("Could not delete project");
  }

  async function createProject() {
    if (!projectForm.name.trim()) return;
    const r = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(projectForm) });
    const d = await r.json();
    if (r.ok) { setProjects((x) => [d.project, ...x]); setProjectOpen(false); setProjectForm({ name: "", description: "", owner: "", due: "" }); toast("Project created"); }
    else toast.error(d.error || "Could not create project");
  }

  async function createTask() {
    if (!taskForm.title.trim()) return;
    const r = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(taskForm) });
    const d = await r.json();
    if (r.ok) { setTasks((x) => [d.task, ...x]); setTaskOpen(false); setTaskForm({ title: "", project: "", owner: "", due: "" }); toast("Task added"); }
    else toast.error(d.error || "Could not add task");
  }

  async function addStep() {
    if (!selected || !stepForm.title.trim()) return;
    const position = steps.filter((s) => s.projectId === selected.id).length + 1;
    const r = await fetch("/api/steps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: selected.id, ...stepForm, position }) });
    const d = await r.json();
    if (r.ok) { setSteps((x) => [...x, d.step]); setStepOpen(false); setStepForm({ title: "", assignee: "", due: "" }); }
    else toast.error(d.error || "Could not add step");
  }

  function toggleStep(step: Step) {
    const order = ["todo", "in_progress", "done"];
    const status = order[(order.indexOf(step.status) + 1) % order.length];
    setSteps((x) => x.map((s) => (s.id === step.id ? { ...s, status } : s)));
    fetch("/api/steps/" + step.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }).catch(() => undefined);
  }

  function updateProjectProgress(project: Project, progress: number) {
    setProjects((x) => x.map((p) => (p.id === project.id ? { ...p, progress } : p)));
    setSelected((s) => (s && s.id === project.id ? { ...s, progress } : s));
    fetch("/api/projects/" + project.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ progress }) }).catch(() => undefined);
  }

  function updateProjectStatus(project: Project, status: string) {
    setProjects((x) => x.map((p) => (p.id === project.id ? { ...p, status } : p)));
    setSelected((s) => (s && s.id === project.id ? { ...s, status } : s));
    fetch("/api/projects/" + project.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }).catch(() => undefined);
  }

  async function createTicket() {
    if (!ticketForm.title.trim()) return;
    const r = await fetch("/api/tickets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...ticketForm, kind: ticketKind }) });
    const d = await r.json();
    if (r.ok) { setTickets((x) => [d.ticket, ...x]); setTicketOpen(false); setTicketForm({ title: "", description: "", priority: "Normal" }); toast(kindLabel[ticketKind] + " submitted"); }
    else toast.error(d.error || "Could not submit");
  }

  async function updateTicket(ticket: Ticket, changes: Partial<Ticket>) {
    const r = await fetch("/api/tickets/" + ticket.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(changes) });
    const d = await r.json();
    if (r.ok) { setTickets((x) => x.map((t) => (t.id === ticket.id ? d.ticket : t))); setSelectedTicket(d.ticket); }
    else toast.error(d.error || "Could not update");
  }

  async function convertTicket(ticket: Ticket) {
    const r = await fetch("/api/tickets/" + ticket.id + "/convert", { method: "POST" });
    const d = await r.json();
    if (r.ok) { setProjects((x) => [d.project, ...x]); setTickets((x) => x.map((t) => (t.id === ticket.id ? d.ticket : t))); setSelectedTicket(null); setSelected(d.project); setView("projects"); toast("Converted to project"); }
    else toast.error(d.error || "Could not convert");
  }

  function openCreate() {
    if (view === "my-work") setTaskOpen(true);
    else if (view === "tickets") setTicketOpen(true);
    else setProjectOpen(true);
  }

  const initials = (identity.name || identity.email || "?").split(/[ @.]/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstNameRaw = (identity.name || identity.email || "there").split(/[@ ]/)[0];
  const firstName = firstNameRaw.charAt(0).toUpperCase() + firstNameRaw.slice(1);

  return (
    <div className="app-shell robust">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>SIGNAL</span><em>WORK OS</em></div>
        <div className="search"><Search size={17} /><input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>⌘ K</kbd></div>
        <div className="top-actions">
          <Button onClick={openCreate}><Plus />Create</Button>
          <span className="avatar">{initials}</span>
        </div>
      </header>
      <div className="workspace">
        <aside className="rail">
          <div className="rail-label">Workspace</div>
          <nav className="rail-tabs">
            {nav.map(([id, label, Icon]) => (
              <button key={id} data-state={view === id ? "active" : undefined} onClick={() => setView(id)}><Icon />{label}</button>
            ))}
          </nav>
          <div className="rail-bottom">
            <button onClick={() => logout().then(() => window.location.reload())}><Settings2 />Sign out</button>
          </div>
        </aside>
        <main className="content">
          {!loaded ? (
            <p>Loading…</p>
          ) : view === "dashboard" ? (
            <>
              <PageHead eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} title={greeting + ", " + firstName + "."} subtitle="Here’s where work needs attention." action={<Button onClick={() => setProjectOpen(true)}><Plus />New project</Button>} />
              <div className="metric-grid">
                <Metric label="Active projects" value={projects.length} detail={attentionProjects.length + " needs attention"} icon={FolderKanban} />
                <Metric label="Open tasks" value={openTasks.length} detail={doneTasks.length + " completed"} icon={ListChecks} />
                <Metric label="Open tickets" value={openTickets.length} detail={tickets.filter((t) => t.priority === "Urgent").length + " urgent"} icon={TicketCheck} />
              </div>
              <section className="panel" style={{ padding: "20px 22px" }}>
                <PanelTitle title="Portfolio health" subtitle="Projects by status" />
                <div className="health-legend">{healthData.map((x) => <div key={x.name}><i style={{ background: x.color }} /><span>{x.name}</span><strong>{x.value}</strong></div>)}</div>
              </section>
              {attentionProjects.length > 0 && (
                <section className="panel" style={{ marginTop: 20, padding: "20px 22px" }}>
                  <PanelTitle title="Needs attention" subtitle="Projects off track" />
                  {attentionProjects.map((p) => (
                    <button key={p.id} className="project-mini" onClick={() => { setSelected(p); setView("projects"); }}>
                      <i style={{ background: p.color }} /><span><strong>{p.name}</strong><small>{p.category}</small></span>
                      <Health value={p.status} /><ChevronRight />
                    </button>
                  ))}
                </section>
              )}
            </>
          ) : view === "my-work" ? (
            <>
              <PageHead eyebrow="Your day" title="My work" subtitle="Everything actionable, in one list." action={<Button onClick={() => setTaskOpen(true)}><Plus />Add task</Button>} />
              <TaskList tasks={openTasks} toggle={toggleTask} onDelete={deleteTask} emptyText="Nothing open — you're clear." />
              {doneTasks.length > 0 && (
                <div className="waiting-block">
                  <div className="section-title"><h2>Completed</h2></div>
                  <TaskList tasks={doneTasks} toggle={toggleTask} onDelete={deleteTask} emptyText="" />
                </div>
              )}
            </>
          ) : view === "projects" ? (
            <>
              <PageHead eyebrow="Portfolio" title="Projects" subtitle={projects.length + " active projects."} action={<Button onClick={() => setProjectOpen(true)}><Plus />New project</Button>} />
              <div className="project-grid">
                {filteredProjects.map((p) => (
                  <button className="project-card" key={p.id} onClick={() => setSelected(p)}>
                    <div className="project-card-top"><span className="project-icon" style={{ background: p.color }}>{p.name[0]}</span></div>
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    <div className="project-tags"><span><Tag />{p.category}</span><span className={"status-text status-" + p.status.replace(" ", "-").toLowerCase()}>{p.status}</span></div>
                    <div className="project-progress"><div><span>Progress</span><strong>{p.progress}%</strong></div><div><i style={{ width: p.progress + "%", background: p.color }} /></div></div>
                    <footer><span>{p.owner}</span><time><Clock3 />{p.due}</time></footer>
                  </button>
                ))}
                {!filteredProjects.length && <div className="empty-plan"><FolderKanban /><strong>No projects yet</strong><span>Create the first one.</span></div>}
              </div>
            </>
          ) : view === "calendar" ? (
            <CalendarView tasks={tasks} projects={projects} />
          ) : view === "activity" ? (
            <ActivityView activity={activity} />
          ) : (
            <>
              <PageHead eyebrow="Intake queue" title="Tickets" subtitle="Requests, issues, and ideas in one place." action={<Button onClick={() => setTicketOpen(true)}><Plus />New {kindLabel[ticketKind].toLowerCase()}</Button>} />
              <div className="filter-row">
                {(["request", "issue", "idea"] as TicketKind[]).map((k) => (
                  <button key={k} className={ticketKind === k ? "filter-active" : ""} onClick={() => setTicketKind(k)}>{kindLabel[k]} <span>{tickets.filter((t) => t.kind === k).length}</span></button>
                ))}
              </div>
              <section className="panel ticket-list">
                <div className="ticket-head"><span>ID</span><span>Title</span><span>Requester</span><span>Priority</span><span>Status</span></div>
                {kindTickets.map((t) => (
                  <button className="ticket-row" key={t.id} onClick={() => setSelectedTicket(t)}>
                    <span>{kindPrefix[t.kind] + String(t.id).padStart(3, "0")}</span>
                    <span><strong>{t.title}</strong><small>{t.description}</small></span>
                    <span className="creator-cell"><span className="avatar">{t.requester.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>{t.requester}</span>
                    <span className={"priority priority-" + t.priority.toLowerCase()}>{t.priority}</span>
                    <span>{t.status}</span>
                  </button>
                ))}
                {!kindTickets.length && <div className="empty-plan"><CheckCircle2 /><strong>Nothing here</strong><span>All clear.</span></div>}
              </section>
            </>
          )}
        </main>
      </div>

      <ProjectDrawer project={selected} setProject={setSelected} steps={steps} onToggleStep={toggleStep} onAddStep={() => setStepOpen(true)} onProgress={updateProjectProgress} onStatus={updateProjectStatus} onDelete={deleteProject} />

      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New project</DialogTitle><DialogDescription>Give it a name and an owner to get started.</DialogDescription></DialogHeader>
          <div className="form-stack">
            <label>Name<Input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} /></label>
            <label>Description<Textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} /></label>
            <div className="form-row">
              <label>Owner<Input value={projectForm.owner} onChange={(e) => setProjectForm({ ...projectForm, owner: e.target.value })} placeholder="Who runs this?" /></label>
              <label>Due<Input value={projectForm.due} onChange={(e) => setProjectForm({ ...projectForm, due: e.target.value })} placeholder="e.g. Oct 18" /></label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setProjectOpen(false)}>Cancel</Button><Button onClick={createProject}>Create project</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add task</DialogTitle></DialogHeader>
          <div className="form-stack">
            <label>Title<Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} /></label>
            <div className="form-row">
              <label>Project<Select value={taskForm.project} onValueChange={(v) => setTaskForm({ ...taskForm, project: v })}><SelectTrigger><SelectValue placeholder="Choose a project" /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem value={p.name} key={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></label>
              <label>Owner<Input value={taskForm.owner} onChange={(e) => setTaskForm({ ...taskForm, owner: e.target.value })} /></label>
            </div>
            <label>Due<Input value={taskForm.due} onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })} placeholder="e.g. Tomorrow" /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button><Button onClick={createTask}>Add task</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stepOpen} onOpenChange={setStepOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add step</DialogTitle></DialogHeader>
          <div className="form-stack">
            <label>Title<Input value={stepForm.title} onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })} /></label>
            <div className="form-row">
              <label>Assignee<Input value={stepForm.assignee} onChange={(e) => setStepForm({ ...stepForm, assignee: e.target.value })} /></label>
              <label>Due<Input value={stepForm.due} onChange={(e) => setStepForm({ ...stepForm, due: e.target.value })} /></label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStepOpen(false)}>Cancel</Button><Button onClick={addStep}>Add step</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New {kindLabel[ticketKind].toLowerCase()}</DialogTitle></DialogHeader>
          <div className="form-stack">
            <label>Title<Input value={ticketForm.title} onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })} /></label>
            <label>Description<Textarea value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} /></label>
            <label>Priority<Select value={ticketForm.priority} onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Urgent">Urgent</SelectItem></SelectContent></Select></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTicketOpen(false)}>Cancel</Button><Button onClick={createTicket}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedTicket} onOpenChange={(v) => !v && setSelectedTicket(null)}>
        <SheetContent className="project-sheet">
          {selectedTicket && (
            <>
              <SheetHeader><SheetTitle>{selectedTicket.title}</SheetTitle><SheetDescription>{kindLabel[selectedTicket.kind]} from {selectedTicket.requester}</SheetDescription></SheetHeader>
              <div className="form-stack" style={{ marginTop: 20 }}>
                <p>{selectedTicket.description}</p>
                <label>Status<Select value={selectedTicket.status} onValueChange={(v) => updateTicket(selectedTicket, { status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="In progress">In progress</SelectItem><SelectItem value="Done">Done</SelectItem></SelectContent></Select></label>
                <label>Owner<Input value={selectedTicket.owner} onChange={(e) => setSelectedTicket({ ...selectedTicket, owner: e.target.value })} onBlur={() => updateTicket(selectedTicket, { owner: selectedTicket.owner })} /></label>
                {selectedTicket.kind === "request" && selectedTicket.status !== "Converted" && <Button onClick={() => convertTicket(selectedTicket)}>Convert to project</Button>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}

function PageHead({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <section className="page-heading"><div><p>{eyebrow}</p><h1>{title}</h1><span>{subtitle}</span></div>{action}</section>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="panel-title"><div><h2>{title}</h2><span>{subtitle}</span></div></div>;
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: React.ElementType }) {
  return <div className="metric"><span><Icon /></span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></div>;
}

function Health({ value }: { value: string }) {
  return <span className={"health health-" + value.replace(" ", "-").toLowerCase()}><i />{value}</span>;
}

function TaskList({ tasks, toggle, onDelete, emptyText }: { tasks: Task[]; toggle: (t: Task) => void; onDelete: (t: Task) => void; emptyText: string }) {
  if (!tasks.length) return emptyText ? <div className="empty-plan"><CheckCircle2 /><strong>{emptyText}</strong></div> : null;
  return (
    <div className="task-list">
      {tasks.map((t) => (
        <article className="task-row" key={t.id}>
          <Checkbox checked={t.status === "done"} onCheckedChange={() => toggle(t)} />
          <div className="task-copy">
            <div className="breadcrumb"><span>{t.project || "No project"}</span></div>
            <h3>{t.title}</h3>
            <div className="task-meta"><span><Users />{t.owner}</span><span><Clock3 />{t.due}</span></div>
          </div>
          {t.impact > 0 && <div className={"impact " + (t.impact >= 3 ? "impact-high" : "")}><Users /><strong>{t.impact}</strong><span>impact</span></div>}
          <button className="row-arrow" style={{ gridColumn: 4 }} onClick={() => onDelete(t)} aria-label="Delete task"><Trash2 /></button>
        </article>
      ))}
    </div>
  );
}

function ProjectDrawer({ project, setProject, steps, onToggleStep, onAddStep, onProgress, onStatus, onDelete }: {
  project: Project | null; setProject: (p: Project | null) => void; steps: Step[];
  onToggleStep: (s: Step) => void; onAddStep: () => void;
  onProgress: (p: Project, v: number) => void; onStatus: (p: Project, v: string) => void;
  onDelete: (p: Project) => void;
}) {
  return (
    <Sheet open={!!project} onOpenChange={(v) => !v && setProject(null)}>
      <SheetContent className="project-sheet">
        {project && (
          <>
            <span className="sheet-project-icon" style={{ background: project.color }}>{project.name[0]}</span>
            <SheetHeader><SheetTitle>{project.name}</SheetTitle><SheetDescription>{project.description}</SheetDescription></SheetHeader>
            <div className="sheet-meta">
              <div><span>Owner</span><strong>{project.owner}</strong></div>
              <div><span>Due</span><strong>{project.due}</strong></div>
            </div>
            <div className="sheet-progress">
              <div><span>Progress</span><strong>{project.progress}%</strong></div>
              <div><i style={{ width: project.progress + "%", background: project.color }} /></div>
            </div>
            <div className="form-row" style={{ marginTop: 14 }}>
              <label>Status<Select value={project.status} onValueChange={(v) => onStatus(project, v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="On track">On track</SelectItem><SelectItem value="Watch">Watch</SelectItem><SelectItem value="At risk">At risk</SelectItem></SelectContent></Select></label>
              <label>Progress %<Input type="number" min={0} max={100} value={project.progress} onChange={(e) => onProgress(project, Math.max(0, Math.min(100, Number(e.target.value) || 0)))} /></label>
            </div>
            <div className="plan">
              <div className="plan-title"><h3>Steps</h3><Button size="sm" variant="outline" onClick={onAddStep}><Plus />Add step</Button></div>
              {steps.filter((s) => s.projectId === project.id).sort((a, b) => a.position - b.position).map((s) => (
                <button key={s.id} className="plan-step" onClick={() => onToggleStep(s)} style={{ width: "100%", textAlign: "left", cursor: "pointer", border: 0, background: "transparent" }}>
                  <CheckCircle2 color={s.status === "done" ? "#2c8b74" : "#c9cfdb"} />
                  <div><strong>{s.title}</strong><span>{s.assignee}</span></div>
                  <span className={"step-status " + (s.status === "done" ? "step-done" : "")}>{s.status.replace("_", " ")}</span>
                  <time>{s.due}</time>
                </button>
              ))}
              {!steps.filter((s) => s.projectId === project.id).length && <div className="empty-plan"><CheckCircle2 /><strong>No steps yet</strong><span>Add the first one.</span></div>}
            </div>
            <Button variant="destructive" size="sm" style={{ marginTop: 24 }} onClick={() => onDelete(project)}><Trash2 />Delete project</Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActivityView({ activity }: { activity: ActivityEntry[] }) {
  function when(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return (
    <>
      <PageHead eyebrow="Audit trail" title="Activity" subtitle="Who added and removed what." />
      <section className="panel activity-panel">
        {activity.map((a) => (
          <div className="activity" key={a.id}>
            <span className={a.action === "deleted" ? "amber" : "blue"}>{a.action === "deleted" ? <Trash2 /> : <Plus />}</span>
            <div>
              <strong>{a.actor} {a.action} {a.entityType} “{a.entityName}”</strong>
              <small>{when(a.createdAt)}</small>
            </div>
          </div>
        ))}
        {!activity.length && <div className="empty-plan"><History /><strong>No activity yet</strong><span>Creates and deletes will show up here.</span></div>}
      </section>
    </>
  );
}

function CalendarView({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthAbbr = now.toLocaleDateString("en-US", { month: "short" }).toLowerCase();

  function color(t: Task) { return projects.find((p) => p.name === t.project)?.color || "#5b6fd8"; }
  function taskDay(due: string): number | null {
    const d = due.trim().toLowerCase();
    if (d === "today") return today;
    if (d === "tomorrow") return today + 1 <= daysInMonth ? today + 1 : null;
    const iso = due.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso && Number(iso[1]) === year && Number(iso[2]) === month + 1) return Number(iso[3]);
    const named = d.match(/^([a-z]{3,})\s+(\d{1,2})$/);
    if (named && named[1].slice(0, 3) === monthAbbr) return Number(named[2]);
    return null;
  }

  const open = tasks.filter((t) => t.status !== "done");
  const scheduled = open.map((t) => ({ t, day: taskDay(t.due) })).filter((x): x is { t: Task; day: number } => x.day !== null);
  const unscheduled = open.filter((t) => taskDay(t.due) === null);
  const cells: (number | null)[] = Array.from({ length: firstWeekday + daysInMonth }, (_, i) => (i < firstWeekday ? null : i - firstWeekday + 1));

  return (
    <>
      <PageHead eyebrow="Schedule" title="Calendar" subtitle="Open tasks by due date." />
      <section className="calendar panel">
        <header>{weekdays.map((d) => <span key={d}>{d}</span>)}</header>
        <div className="calendar-grid">
          {cells.map((d, i) => d === null ? <div className="calendar-cell blank" key={"b" + i} /> : (
            <div className={"calendar-cell " + (d === today ? "today" : "")} key={d}>
              <span>{d}</span>
              {scheduled.filter((x) => x.day === d).slice(0, 3).map((x) => (
                <i key={x.t.id} style={{ borderColor: color(x.t), background: color(x.t) + "14" }}>{x.t.title}</i>
              ))}
            </div>
          ))}
        </div>
      </section>
      {unscheduled.length > 0 && (
        <div className="calendar-legend" style={{ marginTop: 16 }}>
          <strong style={{ fontSize: ".72rem", color: "#7b8599" }}>Unscheduled: </strong>
          {unscheduled.map((t) => <span key={t.id}><i style={{ background: color(t) }} />{t.title}</span>)}
        </div>
      )}
    </>
  );
}
