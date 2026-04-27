import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export const resetDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync("planner.db");
  
  await db.execAsync(`
    DROP TABLE IF EXISTS users_old;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS preferences;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS events;
  `);
  
  db = null;
  await initDatabase();
};

export const migrateDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync("planner.db");
  
  const tableInfo = await db.getFirstAsync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
  );
  
  if (tableInfo?.sql && tableInfo.sql.includes("username") && !tableInfo.sql.includes("email")) {
    await db.execAsync(`
      ALTER TABLE users RENAME TO users_old;
      
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  
  db = null;
};

export const initDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync("planner.db");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      date TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const getTasks = async (): Promise<{ id: string; text: string; completed: number }[]> => {
  if (!db) await initDatabase();
  const result = await db!.getAllAsync<{ id: string; text: string; completed: number }>(
    "SELECT * FROM tasks ORDER BY created_at DESC"
  );
  return result;
};

export const addTask = async (id: string, text: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync("INSERT INTO tasks (id, text, completed) VALUES (?, ?, 0)", [id, text]);
};

export const toggleTask = async (id: string, completed: boolean): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync("UPDATE tasks SET completed = ? WHERE id = ?", [completed ? 1 : 0, id]);
};

export const deleteTask = async (id: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync("DELETE FROM tasks WHERE id = ?", [id]);
};

export const getEvents = async (): Promise<{ id: string; date: string; text: string }[]> => {
  if (!db) await initDatabase();
  const result = await db!.getAllAsync<{ id: string; date: string; text: string }>(
    "SELECT * FROM events ORDER BY date ASC"
  );
  return result;
};

export const addEvent = async (id: string, date: string, text: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync("INSERT INTO events (id, date, text) VALUES (?, ?, ?)", [id, date, text]);
};

export const deleteEvent = async (id: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync("DELETE FROM events WHERE id = ?", [id]);
};

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export const createUser = async (id: string, email: string, passwordHash: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync(
    "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    [id, email, passwordHash]
  );
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  if (!db) await initDatabase();
  const result = await db!.getFirstAsync<User>(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );
  return result || null;
};

export const getUserById = async (id: string): Promise<User | null> => {
  if (!db) await initDatabase();
  const result = await db!.getFirstAsync<User>(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );
  return result || null;
};

export const getFirstUser = async (): Promise<User | null> => {
  if (!db) await initDatabase();
  const result = await db!.getFirstAsync<User>("SELECT * FROM users LIMIT 1");
  return result || null;
};

export const deleteAllUsers = async (): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync("DELETE FROM users");
};

export const getPreference = async (key: string): Promise<string | null> => {
  if (!db) await initDatabase();
  const result = await db!.getFirstAsync<{ value: string }>(
    "SELECT value FROM preferences WHERE key = ?",
    [key]
  );
  return result?.value ?? null;
};

export const setPreference = async (key: string, value: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync(
    "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
    [key, value]
  );
};

export const deletePreference = async (key: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync("DELETE FROM preferences WHERE key = ?", [key]);
};

export const getNoteForDate = async (date: string): Promise<string> => {
  if (!db) await initDatabase();
  const result = await db!.getFirstAsync<{ content: string }>(
    "SELECT content FROM notes WHERE date = ?",
    [date]
  );
  return result?.content ?? "";
};

export const saveNoteForDate = async (date: string, content: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync(
    "INSERT OR REPLACE INTO notes (date, content, updated_at) VALUES (?, ?, datetime('now'))",
    [date, content]
  );
};

export const deleteNoteForDate = async (date: string): Promise<void> => {
  if (!db) await initDatabase();
  await db!.runAsync("DELETE FROM notes WHERE date = ?", [date]);
};
