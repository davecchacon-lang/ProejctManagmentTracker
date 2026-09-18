import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Operations"),
  owner: text("owner").notNull().default("Unassigned"),
  status: text("status").notNull().default("On track"),
  due: text("due").notNull().default("Not set"),
  color: text("color").notNull().default("#5b6fd8"),
  progress: integer("progress").notNull().default(0),
  priority: text("priority").notNull().default("Normal"),
});

export const projectSteps = pgTable("project_steps", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("todo"),
  assignee: text("assignee").notNull().default("Unassigned"),
  due: text("due").notNull().default("Not set"),
  position: integer("position").notNull().default(0),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  project: text("project").notNull().default(""),
  owner: text("owner").notNull().default("Unassigned"),
  due: text("due").notNull().default("Not set"),
  status: text("status").notNull().default("open"),
  impact: integer("impact").notNull().default(0),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priority: text("priority").notNull().default("Normal"),
  status: text("status").notNull().default("New"),
  requester: text("requester").notNull().default(""),
  owner: text("owner").notNull().default("Unassigned"),
  created: text("created").notNull().default("Today"),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(), // "created" | "deleted"
  entityType: text("entity_type").notNull(), // "project" | "task" | "step" | "ticket"
  entityName: text("entity_name").notNull(),
  actor: text("actor").notNull(),
  createdAt: text("created_at").notNull(),
});
