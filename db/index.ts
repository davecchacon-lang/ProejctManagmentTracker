import { drizzle } from "drizzle-orm/netlify-db";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

// The database this app runs on was never migrated (no .sql migration files
// ever existed in this repo), so every table was missing and every query
// failed. Rather than depend on an external migration step, the schema is
// created here, idempotently, the first time a request needs it.
let ready: Promise<void> | null = null;

async function ensureSchema(db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }) {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS projects (
    id serial PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    category text NOT NULL DEFAULT 'Operations',
    owner text NOT NULL DEFAULT 'Unassigned',
    status text NOT NULL DEFAULT 'On track',
    due text NOT NULL DEFAULT 'Not set',
    color text NOT NULL DEFAULT '#5b6fd8',
    progress integer NOT NULL DEFAULT 0,
    priority text NOT NULL DEFAULT 'Normal'
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS project_steps (
    id serial PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects(id),
    title text NOT NULL,
    status text NOT NULL DEFAULT 'todo',
    assignee text NOT NULL DEFAULT 'Unassigned',
    due text NOT NULL DEFAULT 'Not set',
    "position" integer NOT NULL DEFAULT 0
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS tasks (
    id serial PRIMARY KEY,
    title text NOT NULL,
    project text NOT NULL DEFAULT '',
    owner text NOT NULL DEFAULT 'Unassigned',
    due text NOT NULL DEFAULT 'Not set',
    status text NOT NULL DEFAULT 'open',
    impact integer NOT NULL DEFAULT 0
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS tickets (
    id serial PRIMARY KEY,
    kind text NOT NULL,
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    priority text NOT NULL DEFAULT 'Normal',
    status text NOT NULL DEFAULT 'New',
    requester text NOT NULL DEFAULT '',
    owner text NOT NULL DEFAULT 'Unassigned',
    created text NOT NULL DEFAULT 'Today'
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS activity_log (
    id serial PRIMARY KEY,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_name text NOT NULL,
    actor text NOT NULL,
    created_at text NOT NULL
  )`);
}

export async function getDb() {
  const db = drizzle({ schema });
  if (!ready) ready = ensureSchema(db).catch((error) => { ready = null; throw error; });
  await ready;
  return db;
}
