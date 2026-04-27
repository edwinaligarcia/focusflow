import { useState, useCallback, useRef, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  getTasksForDate,
  addTask as dbAddTask,
  toggleTask as dbToggleTask,
  deleteTask as dbDeleteTask,
} from "./lib/db";
import type { TaskRow } from "./lib/db";
import { getSession } from "./lib/auth";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getWeekDates = (): Date[] => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    return d;
  });
};

const getDateKey = (date: Date): string => date.toISOString().split("T")[0];

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string | null;
  time: string | null;
}

const toTask = (r: TaskRow): Task => ({ ...r, completed: r.completed === 1 });

export default function TasksScreen() {
  const today = new Date();
  const [weekDates] = useState<Date[]>(getWeekDates());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const titleRef = useRef<TextInput>(null);

  useEffect(() => {
    getSession().then((session) => {
      if (!session) router.replace("/login");
      else setIsCheckingAuth(false);
    });
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      await initDatabase();
      const rows = await getTasksForDate(getDateKey(selectedDate));
      setTasks(rows.map(toTask));
    } catch (e) {
      console.error("Failed to load tasks", e);
    }
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { loadTasks(); }, [loadTasks]));
  useEffect(() => { loadTasks(); }, [loadTasks]);

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const id = Date.now().toString();
    const dateKey = getDateKey(selectedDate);
    const time = newTime.trim() || undefined;
    await dbAddTask(id, newTitle.trim(), dateKey, time);
    setTasks((prev) => [
      ...prev,
      { id, text: newTitle.trim(), completed: false, date: dateKey, time: time ?? null },
    ]);
    setNewTitle("");
    setNewTime("");
    setIsAdding(false);
  };

  const handleToggle = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next = !task.completed;
    await dbToggleTask(id, next);
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: next } : t)));
  };

  const handleDelete = async (id: string) => {
    await dbDeleteTask(id);
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const openAdd = () => {
    setIsAdding(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewTitle("");
    setNewTime("");
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  const selectedDateStr = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const renderTask = ({ item }: { item: Task }) => (
    <View style={[styles.taskCard, item.completed && styles.taskCardDone]}>
      <TouchableOpacity onPress={() => handleToggle(item.id)} style={styles.checkbox}>
        <Ionicons
          name={item.completed ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={item.completed ? "#4CAF50" : "rgba(255,255,255,0.5)"}
        />
      </TouchableOpacity>
      <View style={styles.taskBody}>
        <Text style={[styles.taskText, item.completed && styles.taskTextDone]}>
          {item.text}
        </Text>
        {item.time ? (
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={11} color="#aaa" />
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={17} color="rgba(255,255,255,0.22)" />
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.subtitle}>
            {isToday(selectedDate) ? "Today  ·  " : ""}
            {selectedDateStr}
          </Text>
        </View>

        {/* Week Strip */}
        <View style={styles.weekStrip}>
          {weekDates.map((date) => {
            const key = getDateKey(date);
            const selected = getDateKey(selectedDate) === key;
            const today_ = isToday(date);
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dayPill,
                  selected && styles.dayPillSelected,
                  today_ && !selected && styles.dayPillToday,
                ]}
                onPress={() => {
                  setSelectedDate(date);
                  setIsAdding(false);
                  setNewTitle("");
                  setNewTime("");
                }}
              >
                <Text style={[styles.dayName, selected && styles.dayTextSelected]}>
                  {DAYS[date.getDay()]}
                </Text>
                <Text style={[styles.dayNum, selected && styles.dayTextSelected]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Count row */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {tasks.length === 0
              ? "No tasks"
              : `${completedCount} of ${tasks.length} completed`}
          </Text>
        </View>

        {/* Task List */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            tasks.length === 0 && { flexGrow: 1 },
          ]}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="checkmark-done-outline"
                size={52}
                color="rgba(255,255,255,0.12)"
              />
              <Text style={styles.emptyText}>No tasks for this day</Text>
              <Text style={styles.emptySubtext}>Tap + to add one</Text>
            </View>
          }
        />

        {/* Add Form */}
        {isAdding && (
          <View style={styles.addForm}>
            <TextInput
              ref={titleRef}
              style={styles.addTitleInput}
              placeholder="What needs to be done?"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newTitle}
              onChangeText={setNewTitle}
              returnKeyType="next"
            />
            <TextInput
              style={styles.addTimeInput}
              placeholder="Time (e.g. 9:00 AM)  —  optional"
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={newTime}
              onChangeText={setNewTime}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <View style={styles.addActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelAdd}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FAB */}
        {!isAdding && (
          <TouchableOpacity style={styles.fab} onPress={openAdd}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0c29",
  },
  loadingText: { color: "#fff", fontSize: 16 },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 14, color: "#aaa", marginTop: 4 },

  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dayPill: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 2,
  },
  dayPillSelected: { backgroundColor: "#4CAF50" },
  dayPillToday: {
    backgroundColor: "rgba(76,175,80,0.2)",
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.5)",
  },
  dayName: { fontSize: 10, color: "#aaa", fontWeight: "600", textTransform: "uppercase" },
  dayNum: { fontSize: 16, fontWeight: "bold", color: "#fff", marginTop: 2 },
  dayTextSelected: { color: "#fff" },

  countRow: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  countText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  taskCardDone: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.04)",
  },
  checkbox: {},
  taskBody: { flex: 1, gap: 4 },
  taskText: { fontSize: 15, color: "#fff", lineHeight: 21 },
  taskTextDone: {
    textDecorationLine: "line-through",
    color: "rgba(255,255,255,0.3)",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: { fontSize: 12, color: "#aaa" },
  deleteBtn: { padding: 4 },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyText: { fontSize: 16, color: "rgba(255,255,255,0.35)", marginTop: 12 },
  emptySubtext: { fontSize: 13, color: "rgba(255,255,255,0.2)" },

  addForm: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    gap: 10,
  },
  addTitleInput: {
    fontSize: 16,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  addTimeInput: {
    fontSize: 14,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  addActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  cancelText: { color: "#aaa", fontSize: 14, fontWeight: "600" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
});
