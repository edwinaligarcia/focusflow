import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SQLite from 'expo-sqlite';

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  createdAt: number;
}

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  addTask: (title: string) => void;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDB();
  }, []);

  const initDB = async () => {
    const db = await SQLite.openDatabaseAsync('focusflow.db');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
      );
    `);

    const result = await db.getAllAsync<Task>('SELECT * FROM tasks ORDER BY createdAt DESC');
    setTasks(result.map(t => ({ ...t, completed: Boolean(t.completed) })));
    setLoading(false);
  };

  const addTask = async (title: string) => {
    const db = await SQLite.openDatabaseAsync('focusflow.db');
    const createdAt = Date.now();
    
    const result = await db.runAsync(
      'INSERT INTO tasks (title, completed, createdAt) VALUES (?, ?, ?)',
      [title, 0, createdAt]
    );
    
    const newTask: Task = {
      id: result.lastInsertRowId,
      title,
      completed: false,
      createdAt,
    };
    
    setTasks((prev) => [newTask, ...prev]);
  };

  const toggleTask = async (id: number) => {
    const db = await SQLite.openDatabaseAsync('focusflow.db');
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    await db.runAsync('UPDATE tasks SET completed = ? WHERE id = ?', [task.completed ? 0 : 1, id]);
    
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  };

  const deleteTask = async (id: number) => {
    const db = await SQLite.openDatabaseAsync('focusflow.db');
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <TaskContext.Provider value={{ tasks, loading, addTask, toggleTask, deleteTask }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
