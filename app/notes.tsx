import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { initDatabase, getNoteForDate, saveNoteForDate, deleteNoteForDate } from "./lib/db";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getDateKey = (date: Date): string => date.toISOString().split("T")[0];

const getWeekDates = (): Date[] => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    return d;
  });
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export default function NotesScreen() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekDates] = useState<Date[]>(getWeekDates());
  const [noteContent, setNoteContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNote = useCallback(async (date: Date) => {
    setIsLoading(true);
    try {
      await initDatabase();
      const content = await getNoteForDate(getDateKey(date));
      setNoteContent(content);
      setSavedContent(content);
    } catch (e) {
      console.error("Failed to load note", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNote(selectedDate);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [selectedDate, loadNote]);

  const handleTextChange = (text: string) => {
    setNoteContent(text);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => autoSave(text), 1500);
  };

  const autoSave = async (text: string) => {
    setIsSaving(true);
    try {
      await saveNoteForDate(getDateKey(selectedDate), text);
      setSavedContent(text);
      setLastSaved(new Date());
    } catch (e) {
      console.error("Failed to auto-save note", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setNoteContent("");
    setSavedContent("");
    await deleteNoteForDate(getDateKey(selectedDate));
    setLastSaved(null);
  };

  const isDirty = noteContent !== savedContent;

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    return lastSaved.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const headerDateStr = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Journal</Text>
              <Text style={styles.selectedDateText}>{headerDateStr}</Text>
            </View>
            <View style={styles.headerActions}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : isDirty ? (
                <Ionicons name="ellipse" size={8} color="#f59e0b" style={{ marginTop: 4 }} />
              ) : lastSaved ? (
                <View style={styles.savedBadge}>
                  <Ionicons name="checkmark" size={12} color="#4CAF50" />
                  <Text style={styles.savedText}>{formatLastSaved()}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Day Picker */}
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
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayPillName, selected && styles.dayPillTextSelected]}>
                  {DAYS[date.getDay()]}
                </Text>
                <Text style={[styles.dayPillNum, selected && styles.dayPillTextSelected]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Note Editor */}
        <ScrollView
          style={styles.editorScroll}
          contentContainerStyle={styles.editorContent}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : (
            <>
              <TextInput
                style={styles.noteInput}
                placeholder={`What's on your mind for ${isToday(selectedDate) ? "today" : headerDateStr}?\n\nWrite freely — your thoughts, goals, reflections...`}
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                value={noteContent}
                onChangeText={handleTextChange}
                textAlignVertical="top"
                scrollEnabled={false}
                autoCorrect
              />

              {/* Word count + clear */}
              <View style={styles.editorFooter}>
                <Text style={styles.wordCount}>
                  {noteContent.trim() === ""
                    ? "Empty"
                    : `${noteContent.trim().split(/\s+/).length} words`}
                </Text>
                {noteContent.length > 0 && (
                  <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                    <Ionicons name="trash-outline" size={14} color="#ff6b6b" />
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
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
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  selectedDateText: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 4,
  },
  headerActions: {
    paddingTop: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76,175,80,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  savedText: {
    fontSize: 11,
    color: "#4CAF50",
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

  editorScroll: { flex: 1 },
  editorContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  noteInput: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: "#fff",
    lineHeight: 26,
    minHeight: 300,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  editorFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  wordCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: "#ff6b6b",
  },
});
