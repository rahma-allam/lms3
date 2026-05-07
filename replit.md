# EduAcademy Pro — LMS Workspace

## Overview

pnpm workspace monorepo using TypeScript. Full-stack LMS with Express 5 API, React 19 + Vite frontends, Drizzle ORM + PostgreSQL. Imported from https://github.com/rahma-allam/lms2.git.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React 19, Vite, TailwindCSS 4, Framer Motion, Recharts

## Artifacts

| Artifact | Kind | Path | Port |
|----------|------|------|------|
| `api-server` | API | `/api` | 8080 |
| `lms-platform` | web | `/` | 20963 |
| `landing-page` | web | `/landing-page/` | 18083 |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Schema

### New tables (added in feature implementation)
- `lesson_completions` — tracks which lessons each student has completed (FK → students, lessons)
- `quizzes` — one quiz per lesson, with title and passingScore
- `quiz_questions` — MCQ questions per quiz (options stored as JSON)
- `quiz_attempts` — student quiz submissions with auto-graded score

## Feature Implementations (6 New Features)

### Feature 1 — Lesson Completion & Progress Tracking
- **Backend**: `POST /api/lessons/:id/complete` — inserts completion record, counts completed/total lessons in course, updates student.progress
- **Frontend**: Checkmark button (✓) on each lesson row in StudentPortal.tsx Lessons tab; turns green when complete; refetches student progress bar on success

### Feature 2 — Monthly Revenue Chart (Real Data)
- **Backend**: `GET /api/dashboard/monthly-revenue` — queries payments table for last 7 months of completed/approved revenue
- **Frontend**: Dashboard.tsx uses `useQuery` to fetch real data; falls back to hardcoded data while loading

### Feature 3 — Student-Instructor Chat (Messages Tab)
- **Frontend only**: New "Messages" tab in StudentPortal.tsx; chat messages persisted in `localStorage` per studentId; simulated instructor auto-reply after 1.5 s

### Feature 4 — Course Content Login Gate
- Already implemented in existing code (CoursePage authentication check + redirect to /login)

### Feature 5 — Secure PDF Upload & Auto-Graded Quizzes
- **Backend (PDF)**: `POST /api/lessons/:id/upload-pdf` (multer, stored in `private-pdfs/`), `POST /api/lessons/:id/pdf-signed-url`, `GET /api/lessons/pdf/:token` — 30-min signed tokens
- **Backend (Quiz)**: Full quiz router at `/api/quizzes` — create/delete quiz, add/delete questions, `POST /:quizId/submit` auto-grades and updates lesson completion
- **Instructor UI**: Hover a lesson in CourseDetail.tsx to reveal 📋 quiz icon → QuizManagerDialog for creating MCQ quizzes with pass threshold
- **Student UI**: QuizWidget shown beneath each lesson in StudentPortal.tsx; shows questions inline, auto-grades, displays pass/fail result, allows retry

### Feature 6 — Student Progress Detail (Instructor View)
- **Backend**: `GET /api/students/:id/progress-detail` — returns per-lesson completion status + latest quiz score per lesson
- **Frontend**: StudentDetail.tsx "Lesson Progress" section shows all modules/lessons with ✓/○ completion icons and quiz score badges

## Lib Packages

| Package | Description |
|---------|-------------|
| `@workspace/db` | Drizzle ORM schema + db client |
| `@workspace/api-spec` | OpenAPI spec |
| `@workspace/api-zod` | Generated Zod schemas |
| `@workspace/api-client-react` | Generated React Query hooks |

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
