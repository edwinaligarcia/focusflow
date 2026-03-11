import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks, Task } from '@/contexts/TaskContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDatesForWeek(baseDate: Date): Date[] {
  const start = getStartOfWeek(baseDate);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export default function WeeklyScreen() {
  const { tasks, toggleTask } = useTasks();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));

  const weekDates = useMemo(() => getDatesForWeek(weekStart), [weekStart]);

  const completedCount = useMemo(() => {
    return tasks.filter(t => t.completed).length;
  }, [tasks]);

  const goToPrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const goToToday = () => {
    setWeekStart(getStartOfWeek(new Date()));
    setSelectedDay(new Date().getDay());
  };

  const formatMonthYear = () => {
    const firstDay = weekDates[0];
    const lastDay = weekDates[6];
    if (firstDay.getMonth() === lastDay.getMonth()) {
      return firstDay.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return `${firstDay.toLocaleDateString('en-US', { month: 'short' })} - ${lastDay.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  const renderTask = useCallback(({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[
        styles.taskItem,
        { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#fff' },
      ]}
      onPress={() => toggleTask(item.id)}
    >
      <View style={styles.checkbox}>
        {item.completed && <View style={[styles.checkboxFilled, { backgroundColor: colors.tint }]} />}
      </View>
      <Text
        style={[
          styles.taskText,
          { color: colors.text },
          item.completed && styles.taskTextCompleted,
        ]}
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  ), [colorScheme, colors, toggleTask]);

  const keyExtractor = useCallback((item: Task) => item.id.toString(), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Weekly</Text>
        <TouchableOpacity onPress={goToToday}>
          <Text style={[styles.todayButton, { color: colors.tint }]}>Today</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={goToPrevWeek} style={styles.navButton}>
          <Text style={[styles.navButtonText, { color: colors.tint }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>{formatMonthYear()}</Text>
        <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
          <Text style={[styles.navButtonText, { color: colors.tint }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {weekDates.map((date, index) => {
          const isSelected = index === selectedDay;
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayColumn,
                isSelected && { backgroundColor: colors.tint },
                isToday && !isSelected && { borderColor: colors.tint, borderWidth: 2 },
              ]}
              onPress={() => setSelectedDay(index)}
            >
              <Text style={[styles.dayName, { color: isSelected ? '#fff' : colors.icon }]}>
                {DAYS[index]}
              </Text>
              <Text style={[styles.dayNumber, { color: isSelected ? '#fff' : colors.text }]}>
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.statsText, { color: colors.icon }]}>
          {completedCount} of {tasks.length} tasks completed
        </Text>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={keyExtractor}
        renderItem={renderTask}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            No tasks yet. Add some in Home!
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  todayButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  dayColumn: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 48,
  },
  dayName: {
    fontSize: 12,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '500',
  },
  statsRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statsText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxFilled: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  taskText: {
    flex: 1,
    fontSize: 16,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});
