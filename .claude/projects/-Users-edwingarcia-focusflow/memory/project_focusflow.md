---
name: FocusFlow Project Overview
description: Core context about the FocusFlow planner app — stack, structure, current state
type: project
---

FocusFlow is a mobile planner app (task manager) built with React Native + Expo for the frontend and Node.js/Express + PostgreSQL for the backend.

**Why:** School semester project. Goal is cross-platform (iOS/Android) task planning.

**Stack:**
- Frontend: React Native with Expo (expo-router for file-based routing, expo-symbols for SF Symbols icons)
- Backend: Node.js + Express (not yet implemented beyond a README)
- Database: PostgreSQL — schema has `users` (id, username, email, password_hash) and `tasks` (id, user_id, title, description, due_date, priority, completed)

**Frontend structure:**
- `app/(tabs)/_layout.tsx` — tab bar with Home and Explore (settings tab not yet added)
- `app/(tabs)/index.tsx` — Home screen (still Expo starter template content)
- `app/(tabs)/explore.tsx` — Explore screen (still starter content)
- `constants/theme.ts` — Colors (light/dark) and Fonts (system-ui/rounded/serif/mono per platform)
- `components/` — ThemedText, ThemedView, ParallaxScrollView, HapticTab, IconSymbol (iOS SF Symbols)
- `hooks/` — useColorScheme, useThemeColor

**Current state (as of 2026-04-27):** Early scaffolding. Tabs still show Expo starter template content. No settings tab exists yet. Backend not implemented.

**How to apply:** When working on this project, keep changes consistent with the Expo/React Native patterns already in place (themed components, SF Symbols icons, file-based routing with expo-router).
