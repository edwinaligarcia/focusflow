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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  initDatabase,
  getTasks,
  addTask as dbAddTask,
  toggleTask as dbToggleTask,
  deleteTask as dbDeleteTask,
} from "./lib/db";
import { getSession } from "./lib/auth";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export default function DailyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      const session = await getSession();
      if (!session) {
        setIsCheckingAuth(false);
        router.replace("/login");
        return;
      }
      setIsCheckingAuth(false);
      loadTasks();
    };
    checkAuth();
  }, [loadTasks]);

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
      setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t)));
    }
  };

  const deleteTask = async (id: string) => {
    await dbDeleteTask(id);
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const renderTask = ({ item }: { item: Task }) => (
    <View style={[styles.taskItem, item.completed && styles.taskItemCompleted]}>
      <TouchableOpacity style={styles.checkbox} onPress={() => toggleTask(item.id)}>
        <Ionicons
          name={item.completed ? "checkbox" : "square-outline"}
          size={24}
          color={item.completed ? "#4CAF50" : "rgba(255,255,255,0.5)"}
        />
      </TouchableOpacity>
      <Text
        style={[styles.taskText, item.completed && styles.taskTextCompleted]}
        onPress={() => toggleTask(item.id)}
      >
        {item.text}
      </Text>
      <TouchableOpacity onPress={() => deleteTask(item.id)}>
        <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={["#0f0c29", "#302b63", "#24243e"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
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
            placeholderTextColor="rgba(255,255,255,0.35)"
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
              <View style={styles.emptyState}>
                <Ionicons name="checkbox-outline" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>No tasks yet</Text>
                <Text style={styles.emptySubtext}>Add one above to get started</Text>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  date: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  taskItemCompleted: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.04)",
  },
  checkbox: {},
  taskText: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    lineHeight: 22,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    color: "rgba(255,255,255,0.35)",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.4)",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "rgba(255,255,255,0.25)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0c29",
  },
  loadingText: {
    fontSize: 16,
    color: "#fff",
  },
});
