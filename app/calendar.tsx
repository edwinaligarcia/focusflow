import { useState, useEffect, useCallback } from "react";
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

const getWeekDates = (): Date[] => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOfWeek + i);
    dates.push(date);
  }
  
  return dates;
};

export default function WeeklyCalendar() {
  const [weekDates] = useState<Date[]>(getWeekDates());
  const [events, setEvents] = useState<Record<string, DayEvent[]>>({});
  const [newEvent, setNewEvent] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      await initDatabase();
      const rows = await getEvents();
      const grouped: Record<string, DayEvent[]> = {};
      rows.forEach((r: { id: string; date: string; text: string }) => {
        if (!grouped[r.date]) {
          grouped[r.date] = [];
        }
        grouped[r.date].push(r);
      });
      setEvents(grouped);
    } catch (e) {
      console.error("Failed to load events", e);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const getDateKey = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const addEvent = async (dateKey: string) => {
    if (newEvent.trim()) {
      const id = Date.now().toString();
      await dbAddEvent(id, dateKey, newEvent.trim());
      setEvents({
        ...events,
        [dateKey]: [...(events[dateKey] || []), { id, date: dateKey, text: newEvent.trim() }],
      });
      setNewEvent("");
      setSelectedDay(null);
    }
  };

  const deleteEvent = async (dateKey: string, eventId: string) => {
    await dbDeleteEvent(eventId);
    setEvents({
      ...events,
      [dateKey]: events[dateKey].filter((e) => e.id !== eventId),
    });
  };

  const formatDayName = (date: Date): string => {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const formatDayNumber = (date: Date): string => {
    return date.getDate().toString();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Calendar</Text>
        <Text style={styles.subtitle}>This Week</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.weekContainer}>
          {weekDates.map((date) => {
            const dateKey = getDateKey(date);
            const dayEvents = events[dateKey] || [];
            const today = isToday(date);

            return (
              <View
                key={dateKey}
                style={[styles.dayColumn, today && styles.todayColumn]}
              >
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayName, today && styles.todayText]}>
                    {formatDayName(date)}
                  </Text>
                  <Text style={[styles.dayNumber, today && styles.todayText]}>
                    {formatDayNumber(date)}
                  </Text>
                </View>

                <View style={styles.eventsContainer}>
                  {dayEvents.map((event) => (
                    <View key={event.id} style={styles.eventItem}>
                      <Text style={styles.eventText} numberOfLines={2}>
                        {event.text}
                      </Text>
                      <TouchableOpacity
                        onPress={() => deleteEvent(dateKey, event.id)}
                      >
                        <Ionicons name="close" size={14} color="#666" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {selectedDay === dateKey ? (
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.eventInput}
                        placeholder="Add event..."
                        value={newEvent}
                        onChangeText={setNewEvent}
                        onSubmitEditing={() => addEvent(dateKey)}
                        autoFocus
                      />
                      <TouchableOpacity onPress={() => addEvent(dateKey)}>
                        <Ionicons name="checkmark" size={20} color="#4CAF50" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addEventButton}
                      onPress={() => setSelectedDay(dateKey)}
                    >
                      <Ionicons name="add" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  weekContainer: {
    flexDirection: "row",
    padding: 8,
    minHeight: 400,
  },
  dayColumn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderRadius: 8,
    minHeight: 300,
  },
  todayColumn: {
    backgroundColor: "#e8f5e9",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  dayHeader: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  dayName: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  todayText: {
    color: "#4CAF50",
  },
  eventsContainer: {
    flex: 1,
    padding: 8,
  },
  eventItem: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventText: {
    flex: 1,
    fontSize: 11,
    color: "#333",
  },
  addEventButton: {
    alignItems: "center",
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    padding: 6,
    borderRadius: 4,
  },
  eventInput: {
    flex: 1,
    fontSize: 11,
    padding: 2,
  },
});
