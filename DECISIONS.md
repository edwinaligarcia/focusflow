# Decision Log


**Decision:** Use React Native with Expo for the mobile frontend and Node.js with Express for the backend, with PostgreSQL as the primary database.

**Rationale:** React Native with Expo lets me build and test directly on mobile devices with minimal setup. Node.js and Express allow me to use JavaScript across frontend and backend, keeping the stack consistent and reducing complexity. PostgreSQL provides a reliable relational database for users, tasks, dates, and completion status.

**Alternatives Considered:**
- Flutter (would require learning Dart and a new ecosystem during a short semester).
- Native Android only (less portable to iOS, more boilerplate).
- MongoDB instead of PostgreSQL (less natural fit for relational task/user data).
