import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  initDatabase,
  getTasksForDate,
  addTask as dbAddTask,
  toggleTask as dbToggleTask,
  deleteTask as dbDeleteTask,
} from "./lib/db";
import type { TaskRow } from "./lib/db";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

const formatDayHeading = (date: Date): string => {
  const day = DAYS_SHORT[date.getDay()].toUpperCase();
  const month = MONTHS[date.getMonth()];
  return `${day}, ${month} ${date.getDate()}`;
};

interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string | null;
  time: string | null;
}

const toTask = (r: TaskRow): Task => ({ ...r, completed: r.completed === 1 });

export default function WeeklyCalendar() {
  const [weekDates] = useState<Date[]>(getWeekDates());
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const addInputRef = useRef<TextInput>(null);

  const loadTasks = useCallback(async () => {
    try {
      await initDatabase();
      const dateKeys = weekDates.map(getDateKey);
      const results = await Promise.all(dateKeys.map((k) => getTasksForDate(k)));
      const grouped: Record<string, Task[]> = {};
      dateKeys.forEach((k, i) => { grouped[k] = results[i].map(toTask); });
      setTasksByDate(grouped);
    } catch (e) {
      console.error("Failed to load calendar tasks", e);
    }
  }, [weekDates]);

  useFocusEffect(useCallback(() => { loadTasks(); }, [loadTasks]));

  const handleAdd = async (dateKey: string) => {
    if (!newTitle.trim()) { setAddingFor(null); return; }
    const id = Date.now().toString();
    const time = newTime.trim() || undefined;
    await dbAddTask(id, newTitle.trim(), dateKey, time);
    const newTask: Task = {
      id, text: newTitle.trim(), completed: false,
      date: dateKey, time: time ?? null,
    };
    setTasksByDate((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] ?? []), newTask],
    }));
    setNewTitle("");
    setNewTime("");
    setAddingFor(null);
  };

  const handleToggle = async (dateKey: string, id: string) => {
    const task = tasksByDate[dateKey]?.find((t) => t.id === id);
    if (!task) return;
    const next = !task.completed;
    await dbToggleTask(id, next);
    setTasksByDate((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey].map((t) => (t.id === id ? { ...t, completed: next } : t)),
    }));
  };

  const handleDelete = async (dateKey: string, id: string) => {
    await dbDeleteTask(id);
    setTasksByDate((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey].filter((t) => t.id !== id),
    }));
  };

  const openAdd = (dateKey: string) => {
    setAddingFor(dateKey);
    setNewTitle("");
    setNewTime("");
    setTimeout(() => addInputRef.current?.focus(), 50);
  };

  const weekRangeStr = (() => {
    const first = weekDates[0];
    const last = weekDates[6];
    return `${MONTHS[first.getMonth()]} ${first.getDate()} – ${MONTHS[last.getMonth()]} ${last.getDate()}`;
  })();

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
          <Text style={styles.title}>This Week</Text>
          <Text style={styles.subtitle}>{weekRangeStr}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {weekDates.map((date) => {
            const dateKey = getDateKey(date);
            const dayTasks = tasksByDate[dateKey] ?? [];
            const today_ = isToday(date);
            const isAddingHere = addingFor === dateKey;

            return (
              <View key={dateKey} style={styles.daySection}>
                {/* Day Header */}
                <View style={[styles.dayHeader, today_ && styles.dayHeaderToday]}>
                  <View style={styles.dayHeaderLeft}>
                    {today_ && <View style={styles.todayDot} />}
                    <Text style={[styles.dayHeading, today_ && styles.dayHeadingToday]}>
                      {formatDayHeading(date)}
                    </Text>
                    {dayTasks.length > 0 && (
                      <View style={styles.taskCountBadge}>
                        <Text style={styles.taskCountText}>{dayTasks.length}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addDayBtn}
                    onPress={() => isAddingHere ? setAddingFor(null) : openAdd(dateKey)}
                  >
                    <Ionicons
                      name={isAddingHere ? "close" : "add"}
                      size={18}
                      color={today_ ? "#4CAF50" : "rgba(255,255,255,0.4)"}
                    />
                  </TouchableOpacity>
                </View>

                {/* Inline Add Form */}
                {isAddingHere && (
                  <View style={styles.inlineForm}>
                    <TextInput
                      ref={addInputRef}
                      style={styles.inlineTitleInput}
                      placeholder="Task title..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={newTitle}
                      onChangeText={setNewTitle}
                      returnKeyType="next"
                    />
                    <TextInput
                      style={styles.inlineTimeInput}
                      placeholder="Time (e.g. 2:00 PM)  —  optional"
                      placeholderTextColor="rgba(255,255,255,0.22)"
                      value={newTime}
                      onChangeText={setNewTime}
                      returnKeyType="done"
                      onSubmitEditing={() => handleAdd(dateKey)}
                    />
                    <View style={styles.inlineActions}>
                      <TouchableOpacity
                        style={styles.inlineCancelBtn}
                        onPress={() => setAddingFor(null)}
                      >
                        <Text style={styles.inlineCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.inlineAddBtn}
                        onPress={() => handleAdd(dateKey)}
                      >
                        <Text style={styles.inlineAddText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Tasks */}
                {dayTasks.length === 0 && !isAddingHere ? (
                  <Text style={styles.emptyDay}>No tasks</Text>
                ) : (
                  dayTasks.map((task) => (
                    <View
                      key={task.id}
                      style={[styles.agendaTask, task.completed && styles.agendaTaskDone]}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggle(dateKey, task.id)}
                        style={styles.agendaCheckbox}
                      >
                        <Ionicons
                          name={task.completed ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={task.completed ? "#4CAF50" : "rgba(255,255,255,0.45)"}
                        />
                      </TouchableOpacity>
                      <View style={styles.agendaTaskBody}>
                        <Text
                          style={[
                            styles.agendaTaskText,
                            task.completed && styles.agendaTaskTextDone,
                          ]}
                        >
                          {task.text}
                        </Text>
                        {task.time ? (
                          <View style={styles.agendaTimeBadge}>
                            <Ionicons name="time-outline" size={10} color="#aaa" />
                            <Text style={styles.agendaTimeText}>{task.time}</Text>
                          </View>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDelete(dateKey, task.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={15}
                          color="rgba(255,255,255,0.2)"
                        />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 14, color: "#aaa", marginTop: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  daySection: {
    marginBottom: 6,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginVertical: 5,
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  dayHeaderToday: {
    borderBottomColor: "rgba(76,175,80,0.2)",
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  todayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  dayHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.5,
  },
  dayHeadingToday: { color: "#4CAF50" },
  taskCountBadge: {
    backgroundColor: "rgba(76,175,80,0.2)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  taskCountText: { fontSize: 11, color: "#4CAF50", fontWeight: "700" },
  addDayBtn: { padding: 4 },

  emptyDay: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "rgba(255,255,255,0.2)",
    fontStyle: "italic",
  },

  agendaTask: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    gap: 10,
  },
  agendaTaskDone: { opacity: 0.5 },
  agendaCheckbox: {},
  agendaTaskBody: { flex: 1, gap: 2 },
  agendaTaskText: { fontSize: 14, color: "#fff", lineHeight: 20 },
  agendaTaskTextDone: {
    textDecorationLine: "line-through",
    color: "rgba(255,255,255,0.4)",
  },
  agendaTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  agendaTimeText: { fontSize: 11, color: "#aaa" },

  inlineForm: {
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  inlineTitleInput: {
    fontSize: 14,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.3)",
  },
  inlineTimeInput: {
    fontSize: 13,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  inlineActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  inlineCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  inlineCancelText: { color: "#aaa", fontSize: 13 },
  inlineAddBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
  },
  inlineAddText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
