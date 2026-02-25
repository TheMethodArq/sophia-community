import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { SOPHIA_DIR, SOPHIA_DB_FILE } from "@sophia-code/shared";

let dbInstance: Database.Database | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  pid INTEGER,
  intent TEXT,
  status TEXT CHECK(status IN ('active', 'idle', 'ended')) DEFAULT 'active',
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  pattern TEXT NOT NULL,
  claim_type TEXT CHECK(claim_type IN ('soft', 'hard')) DEFAULT 'soft',
  created_at TEXT NOT NULL,
  released_at TEXT,
  UNIQUE(session_id, pattern)
);

CREATE TABLE IF NOT EXISTS corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  project TEXT,
  pattern TEXT NOT NULL,
  reason TEXT NOT NULL,
  correction TEXT NOT NULL,
  file_types TEXT,
  keywords TEXT,
  severity TEXT CHECK(severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  times_applied INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  project TEXT,
  description TEXT NOT NULL,
  context TEXT,
  implementation TEXT NOT NULL,
  file_types TEXT,
  keywords TEXT,
  effectiveness TEXT CHECK(effectiveness IN ('low', 'medium', 'high')) DEFAULT 'medium',
  times_used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(id),
  decision TEXT NOT NULL,
  rationale TEXT,
  alternatives TEXT,
  files_affected TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  overall_score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  categories TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bulletin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(id),
  agent TEXT,
  entry_type TEXT NOT NULL,
  message TEXT NOT NULL,
  files TEXT,
  warning TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS encounters (
  rule_id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  times_seen INTEGER DEFAULT 1,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS builds (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  plan_path TEXT,
  status TEXT CHECK(status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  current_sprint INTEGER,
  current_task INTEGER,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  build_id TEXT NOT NULL REFERENCES builds(id),
  sprint_number INTEGER,
  task_number INTEGER,
  state TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  build_id TEXT NOT NULL REFERENCES builds(id),
  sprint_number INTEGER,
  task_number INTEGER,
  description TEXT,
  status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id TEXT NOT NULL REFERENCES builds(id),
  task_id TEXT REFERENCES tasks(id),
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id TEXT NOT NULL REFERENCES builds(id),
  task_id TEXT REFERENCES tasks(id),
  action_type TEXT NOT NULL,
  classification TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_claims_session ON claims(session_id);
CREATE INDEX IF NOT EXISTS idx_claims_active ON claims(released_at) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corrections_keywords ON corrections(keywords);
CREATE INDEX IF NOT EXISTS idx_patterns_keywords ON patterns(keywords);
CREATE INDEX IF NOT EXISTS idx_bulletin_created ON bulletin(created_at);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_project ON builds(project_path);
CREATE INDEX IF NOT EXISTS idx_checkpoints_build ON checkpoints(build_id);
CREATE INDEX IF NOT EXISTS idx_tasks_build ON tasks(build_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_token_usage_build ON token_usage(build_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_task ON token_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_actions_build ON actions(build_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
`;

export function getDb(projectRoot?: string): Database.Database {
  if (dbInstance) return dbInstance;

  const root = projectRoot ?? process.cwd();
  const dbPath = path.join(root, SOPHIA_DIR, SOPHIA_DB_FILE);

  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");

  return dbInstance;
}

export function initDb(projectRoot: string): Database.Database {
  const dbPath = path.join(projectRoot, SOPHIA_DIR, SOPHIA_DB_FILE);
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  dbInstance = db;
  return db;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
