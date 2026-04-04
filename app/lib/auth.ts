import bcrypt from "bcryptjs";
import { createUser, getUserById, getFirstUser, initDatabase, deleteAllUsers, getPreference, setPreference, deletePreference, resetDatabase, migrateDatabase } from "./db";
import { generateId } from "./utils";

bcrypt.setRandomFallback((len: number) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const result = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = Math.floor(Math.random() * chars.length);
  }
  return Array.from(result);
});

const SESSION_KEY = "@focusflow_session";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const setSession = async (userId: string): Promise<void> => {
  try {
    await setPreference(SESSION_KEY, userId);
  } catch (error) {
    console.error("Failed to set session:", error);
  }
};

export const getSession = async (): Promise<string | null> => {
  try {
    return await getPreference(SESSION_KEY);
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await deletePreference(SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
};

export const isFirstLaunch = async (): Promise<boolean> => {
  await initDatabase();
  const user = await getFirstUser();
  return user === null;
};

export const createNewUser = async (email: string, password: string): Promise<void> => {
  const userId = generateId();
  const passwordHash = await hashPassword(password);
  await createUser(userId, email, passwordHash);
  await setSession(userId);
};

export const loginUser = async (password: string): Promise<boolean> => {
  const user = await getFirstUser();
  if (!user) return false;
  
  const isValid = await verifyPassword(password, user.password_hash);
  if (isValid) {
    await setSession(user.id);
    return true;
  }
  return false;
};

export const getCurrentUser = async () => {
  const session = await getSession();
  if (!session) return null;
  return getUserById(session);
};

export const logout = async (): Promise<void> => {
  await clearSession();
};

export const clearAllUserData = async (): Promise<void> => {
  await clearSession();
  await deleteAllUsers();
};

export { resetDatabase, migrateDatabase };
