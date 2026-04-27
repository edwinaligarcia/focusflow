import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  loginUser,
  isFirstLaunch,
  createNewUser,
  resetDatabase,
  migrateDatabase,
  getSession,
} from "./lib/auth";

export default function LoginScreen() {
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    const session = await getSession();
    if (session) {
      router.replace("/");
      return;
    }
    const firstTime = await isFirstLaunch();
    setIsNewUser(firstTime);
  };

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleResetDatabase = () => {
    Alert.alert(
      "Reset App",
      "This will delete all data and start fresh. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await resetDatabase();
              await migrateDatabase();
              setIsNewUser(true);
              setEmail("");
              setPassword("");
              setConfirmPassword("");
              setError("");
            } catch (err) {
              console.error("Reset error:", err);
              setError("Reset failed. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (isNewUser && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (isNewUser) {
        await createNewUser(email.toLowerCase().trim(), password);
        router.replace("/");
      } else {
        const success = await loginUser(email, password);
        if (success) {
          router.replace("/");
        } else {
          setError("Invalid email or password");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const message = err?.message ?? String(err);
      if (message.includes("UNIQUE constraint failed")) {
        setError("An account with this email already exists.");
        setIsNewUser(false);
      } else {
        setError(isNewUser ? "Failed to create account." : "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isNewUser === null) {
    return (
      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0f0c29", "#302b63", "#24243e"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBadge}>
              <Ionicons name="checkmark-done-outline" size={36} color="#fff" />
            </View>
          </View>

          <Text style={styles.appName}>FocusFlow</Text>
          <Text style={styles.title}>
            {isNewUser ? "Create your account" : "Welcome back"}
          </Text>
          <Text style={styles.subtitle}>
            {isNewUser
              ? "Set up your account to get started"
              : "Sign in to continue"}
          </Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {isNewUser ? "Create password" : "Password"}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={isNewUser ? "At least 6 characters" : "Enter your password"}
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onSubmitEditing={!isNewUser ? handleSubmit : undefined}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#aaa"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password (signup only) */}
          {isNewUser && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isNewUser ? "Get Started" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleResetDatabase}>
            <Text style={styles.resetButtonText}>Reset App</Text>
          </TouchableOpacity>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(76,175,80,0.25)",
    borderWidth: 2,
    borderColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4CAF50",
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 36,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#aaa",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
  },
  eyeButton: {
    paddingHorizontal: 14,
  },
  error: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resetButton: {
    marginTop: 24,
    alignItems: "center",
  },
  resetButtonText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 13,
  },
});
