import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

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
