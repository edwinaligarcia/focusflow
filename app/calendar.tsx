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
  getEvents,
  addEvent as dbAddEvent,
  deleteEvent as dbDeleteEvent,
} from "./lib/db";

interface DayEvent {
  id: string;
  text: string;
  date: string;
}

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

export default function WeeklyCalendar() {
  const today = new Date();
  const [weekDates] = useState<Date[]>(getWeekDates());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [events, setEvents] = useState<Record<string, DayEvent[]>>({});
  const [newEvent, setNewEvent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const loadEvents = useCallback(async () => {
    try {
      await initDatabase();
      const rows = await getEvents();
      const grouped: Record<string, DayEvent[]> = {};
      rows.forEach((r: { id: string; date: string; text: string }) => {
        if (!grouped[r.date]) grouped[r.date] = [];
        grouped[r.date].push(r);
      });
      setEvents(grouped);
    } catch (e) {
      console.error("Failed to load events", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const selectedKey = getDateKey(selectedDate);
  const selectedEvents = events[selectedKey] || [];

  const addEvent = async () => {
    if (!newEvent.trim()) return;
    const id = Date.now().toString();
    await dbAddEvent(id, selectedKey, newEvent.trim());
    setEvents((prev) => ({
      ...prev,
      [selectedKey]: [...(prev[selectedKey] || []), { id, date: selectedKey, text: newEvent.trim() }],
    }));
    setNewEvent("");
    setIsAdding(false);
  };

  const deleteEvent = async (eventId: string) => {
    await dbDeleteEvent(eventId);
    setEvents((prev) => ({
      ...prev,
      [selectedKey]: (prev[selectedKey] || []).filter((e) => e.id !== eventId),
    }));
  };

  const handleAddPress = () => {
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const selectedDateStr = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const weekRangeStr = (() => {
    const first = weekDates[0];
    const last = weekDates[6];
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${first.toLocaleDateString("en-US", opts)} – ${last.toLocaleDateString("en-US", opts)}`;
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
          <Text style={styles.title}>Weekly Calendar</Text>
          <Text style={styles.subtitle}>{weekRangeStr}</Text>
        </View>

        {/* Day Strip */}
        <View style={styles.weekStrip}>
          {weekDates.map((date) => {
            const key = getDateKey(date);
            const selected = getDateKey(selectedDate) === key;
            const today_ = isToday(date);
            const hasEvents = (events[key] || []).length > 0;
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
                  setNewEvent("");
                }}
              >
                <Text style={[styles.dayPillName, selected && styles.dayPillTextSelected]}>
                  {DAYS[date.getDay()]}
                </Text>
                <Text style={[styles.dayPillNum, selected && styles.dayPillTextSelected]}>
                  {date.getDate()}
                </Text>
                {hasEvents && (
                  <View style={[styles.eventDot, selected && styles.eventDotSelected]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Label */}
        <View style={styles.selectedDayRow}>
          <Text style={styles.selectedDayLabel}>
            {isToday(selectedDate) ? "Today  ·  " : ""}{selectedDateStr}
          </Text>
          <Text style={styles.eventCount}>
            {selectedEvents.length} {selectedEvents.length === 1 ? "event" : "events"}
          </Text>
        </View>

        {/* Event List */}
        <ScrollView
          style={styles.eventList}
          contentContainerStyle={styles.eventListContent}
          keyboardShouldPersistTaps="handled"
        >
          {selectedEvents.length === 0 && !isAdding && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>No events for this day</Text>
              <Text style={styles.emptySubtext}>Tap + to add one</Text>
            </View>
          )}

          {selectedEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventDotBar} />
              <Text style={styles.eventCardText}>{event.text}</Text>
              <TouchableOpacity
                onPress={() => deleteEvent(event.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          ))}

          {isAdding && (
            <View style={styles.addInputCard}>
              <View style={[styles.eventDotBar, styles.eventDotBarGreen]} />
              <TextInput
                ref={inputRef}
                style={styles.addInput}
                placeholder="New event..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={newEvent}
                onChangeText={setNewEvent}
                onSubmitEditing={addEvent}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addEvent}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Add Button */}
        {!isAdding && (
          <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {isAdding && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setIsAdding(false);
              setNewEvent("");
            }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 4,
  },

  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dayPill: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 2,
  },
  dayPillSelected: {
    backgroundColor: "#4CAF50",
  },
  dayPillToday: {
    backgroundColor: "rgba(76,175,80,0.2)",
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.5)",
  },
  dayPillName: {
    fontSize: 10,
    color: "#aaa",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dayPillNum: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 2,
  },
  dayPillTextSelected: {
    color: "#fff",
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
    marginTop: 4,
  },
  eventDotSelected: {
    backgroundColor: "#fff",
  },

  selectedDayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  selectedDayLabel: {
    fontSize: 14,
    color: "#aaa",
    flex: 1,
  },
  eventCount: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },

  eventList: { flex: 1 },
  eventListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
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

  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  eventDotBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  eventDotBarGreen: {
    backgroundColor: "#4CAF50",
  },
  eventCardText: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
    lineHeight: 22,
  },

  addInputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76,175,80,0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.3)",
    gap: 12,
  },
  addInput: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelButton: {
    position: "absolute",
    right: 20,
    bottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  cancelText: {
    color: "#aaa",
    fontSize: 15,
    fontWeight: "600",
  },
});
