import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  initDatabase,
  getTasks,
  addTask as dbAddTask,
  toggleTask as dbToggleTask,
  deleteTask as dbDeleteTask,
} from "./lib/db";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export default function DailyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      await initDatabase();
      const rows = await getTasks();
      setTasks(rows.map((r: { id: string; text: string; completed: number }) => ({ ...r, completed: r.completed === 1 })));
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async () => {
    if (newTask.trim()) {
      const id = Date.now().toString();
      await dbAddTask(id, newTask.trim());
      setTasks([{ id, text: newTask.trim(), completed: false }, ...tasks]);
      setNewTask("");
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      const newCompleted = !task.completed;
      await dbToggleTask(id, newCompleted);
      setTasks(
        tasks.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t))
      );
    }
  };

  const deleteTask = async (id: string) => {
    await dbDeleteTask(id);
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => toggleTask(item.id)}
      >
        <Ionicons
          name={item.completed ? "checkbox" : "square-outline"}
          size={24}
          color={item.completed ? "#4CAF50" : "#666"}
        />
      </TouchableOpacity>
      <Text
        style={[styles.taskText, item.completed && styles.taskCompleted]}
        onPress={() => toggleTask(item.id)}
      >
        {item.text}
      </Text>
      <TouchableOpacity onPress={() => deleteTask(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Daily Tasks</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new task..."
          value={newTask}
          onChangeText={setNewTask}
          onSubmitEditing={addTask}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>No tasks yet. Add one above!</Text>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  date: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    marginLeft: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  taskText: {
    flex: 1,
    fontSize: 16,
  },
  taskCompleted: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
});
