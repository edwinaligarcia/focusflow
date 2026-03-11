import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks, Task } from '@/contexts/TaskContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const [newTask, setNewTask] = useState('');
  const { tasks, loading, addTask, toggleTask, deleteTask } = useTasks();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleAddTask = () => {
    if (newTask.trim()) {
      addTask(newTask.trim());
      setNewTask('');
    }
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
      ]
    );
  };

  const renderTask = useCallback(({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[
        styles.taskItem,
        { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#fff' },
      ]}
      onPress={() => toggleTask(item.id)}
      onLongPress={() => handleDeleteTask(item)}
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
  ), [colorScheme, colors, toggleTask, deleteTask]);

  const keyExtractor = useCallback((item: Task) => item.id.toString(), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>My Tasks</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          {tasks.filter((t) => !t.completed).length} remaining
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
              color: colors.text,
            },
          ]}
          placeholder="Add a new task..."
          placeholderTextColor={colors.icon}
          value={newTask}
          onChangeText={setNewTask}
          onSubmitEditing={handleAddTask}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={handleAddTask}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={keyExtractor}
        renderItem={renderTask}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
          ) : (
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No tasks yet. Add one above!
            </Text>
          )
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
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
