# Kazier - QWEN.md

## Project Overview

**Kazier** is a daily activity reporting system for the Africa Samurai team. It features a Slack bot ("Groot Bot") that sends automated reminders at scheduled times, and team members submit their daily reports through a multi-step form. Reports are saved to a PostgreSQL database (Neon) and sent to the boss via direct message.

### Key Features

- **Automated Slack Reminders**: Groot Bot posts daily reminders in the Slack channel at 17:00 (weekdays)
- **Multi-step Form**: 7-step form with animations, character counters, and autocomplete for names
- **Double Submission Prevention**: Users cannot submit reports twice on the same day
- **Review Before Submit**: Users can review their answers before final submission
- **Boss DM**: Each submitted report is sent to the boss via Slack DM
- **Individual Follow-up**: At 18:00, the bot DMs each member who hasn't submitted
- **Nightly Summary**: At midnight, the bot sends the boss a summary of who submitted and who didn't
- **Database Storage**: All reports are saved to Neon (PostgreSQL)

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | Frontend framework + API routes |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS v4** | Styling |
| **Prisma** | ORM for database operations |
| **Neon** | Serverless PostgreSQL database |
| **NextAuth.js** | Authentication |
| **Slack API** | Bot messaging |
| **Vercel** | Hosting |
| **bcryptjs** | Password hashing |

## Project Structure

```
kazier/
├── app/
│   ├── api/
│   │   ├── auth/              # NextAuth endpoints
│   │   ├── citation/          # Quote API
│   │   ├── cron/
│   │   │   ├── remind/        # Daily channel reminder (17:00)
│   │   │   ├── chase/         # Individual follow-up for absent members (18:00)
│   │   │   └── summary/       # Nightly summary to boss (00:00)
│   │   ├── ping/              # Health check
│   │   ├── slack/             # Slack integration
│   │   └── upload/            # File uploads
│   ├── dashboard/
│   │   ├── equipe/            # Team management
│   │   ├── projects/          # Project management
│   │   ├── rapports/          # Reports management
│   │   ├── tasks/             # Task management
│   │   └── teams/             # Teams configuration
│   ├── login/                 # Login page
│   ├── reset-password/        # Password reset
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page (Daily Form)
├── components/
│   ├── DailyForm/
│   │   ├── index.tsx          # Main form logic + state + routing
│   │   ├── questions.ts       # Question definitions + brand color
│   │   ├── Screen.tsx         # Layout wrapper
│   │   ├── Confetti.tsx       # Success animation
│   │   ├── SubmitButton.tsx   # Submit button component
│   │   ├── WelcomeScreen.tsx  # Welcome view
│   │   ├── FormScreen.tsx     # Form view
│   │   ├── ReviewScreen.tsx   # Review before submit
│   │   ├── SuccessScreen.tsx  # Success view
│   │   └── RichTextArea.tsx   # Rich text editor
│   ├── dashboard/             # Dashboard components
│   └── AuthProvider.tsx       # Auth context provider
├── hooks/                     # Custom React hooks
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── actions.ts             # Core server actions (Slack + Daily form)
│   ├── auth-actions.ts        # Authentication actions (password reset, etc.)
│   ├── equipe-actions.ts      # Team page data fetching
│   ├── rapports-actions.ts    # Reports page data fetching
│   ├── permissions.ts         # Role-based permissions
│   ├── project-actions.ts     # Project CRUD operations
│   ├── register-actions.ts    # User registration
│   ├── report-actions.ts      # Report CRUD operations (legacy)
│   ├── task-actions.ts        # Task management
│   ├── team-actions.ts        # Team-member project/task operations
│   ├── notify-task.ts         # Slack task notifications
│   └── ...                    # Other action modules
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── migrations/            # Database migrations
├── public/                    # Static assets
├── auth.ts                    # NextAuth configuration
├── middleware.ts              # Auth middleware + route protection
├── prisma.config.ts           # Prisma configuration
└── next.config.ts             # Next.js configuration
```

## Database Schema (Prisma)

The database schema is defined in `prisma/schema.prisma` and managed through Prisma migrations.

### `teams` Model - Team Members

```prisma
model teams {
  id         Int       @id @default(autoincrement())
  first_name String?
  last_name  String?
  role       String?
  email      String?
  phone      String?
  age        Int?
  slack_id   String?
  is_boss    Boolean   @default(false)
  created_at DateTime  @default(now())

  users      users[]
  rapports   rapports[]
}
```

### `users` Model - Authentication

```prisma
model users {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  password String
  role     String?
  team_id  Int?

  team     teams?  @relation(fields: [team_id], references: [id])
}
```

### `rapports` Model - Reports

```prisma
model rapports {
  id                 Int       @id @default(autoincrement())
  team_id            Int?
  project_id         Int?
  work_built         String?
  working_built      String?
  validated_learning String?
  broken_features    String?
  needed_learning    String?
  tomorrow_build     String?
  created_at         DateTime  @default(now())

  team               teams?    @relation(fields: [team_id], references: [id])
  project            project?  @relation(fields: [project_id], references: [id])
}
```

### `tasks` Model - Tasks

```prisma
model tasks {
  id          Int       @id @default(autoincrement())
  title       String?
  description String?
  status      String?
  priority    String?
  project_id  Int?
  assigned_to Int[]
  due_date    DateTime? @db.Date
  created_at  DateTime  @default(now())

  project     project?  @relation(fields: [project_id], references: [id])
}
```

### `project` Model - Projects

```prisma
model project {
  id          Int     @id @default(autoincrement())
  name        String?
  description String?
  icon        String?
  team_ids    Int[]

  tasks       tasks[]
  rapports    rapports[]
}
```

## Building and Running

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Open in browser (always kill existing server first)
# 1. Kill existing server: Ctrl+C or kill the process
# 2. Then run: npm run dev
# 3. Open: http://localhost:3000
```

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://...

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C0XXXXXXX
SLACK_BOSS_USER_ID=U0XXXXXXX

# App
NEXT_PUBLIC_FORM_URL=https://rapportjournalier.vercel.app
```

## Role-Based Permissions

The application uses a role-based access control system:

| Role | Description | Dashboard Access | Can View Reports | Can Edit Reports | Can Manage Team |
|------|-------------|------------------|------------------|------------------|-----------------|
| `SA` | Super Admin | Full | ✅ | ✅ | ✅ |
| `TM` | Team Manager | Full | ✅ | ❌ | ❌ |
| `T`  | Team Member | Teams only | ❌ | ❌ | ❌ |

Permissions are defined in `lib/permissions.ts`.

## Cron Jobs

| Cron | Endpoint | Schedule (UTC) | Local Time (WAT) | Description |
|------|----------|----------------|------------------|-------------|
| Remind | `/api/cron/remind` | `30 20 * * 1-5` | 17:00 | Daily channel reminder |
| Chase | `/api/cron/chase` | Manual trigger | 18:00 | Individual follow-up DMs |
| Summary | `/api/cron/summary` | Manual trigger | 00:00 | Nightly summary to boss |

> Note: The Vercel cron is configured for the remind endpoint. The chase and summary endpoints may be triggered externally (e.g., cron-job.org).

## Slack Bot Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. **Create New App** → From scratch
3. Add OAuth scopes:
   - `chat:write` - Send messages
   - `im:write` - Send DMs
   - `users:read` - Read user profiles
   - `channels:read` - Read channel info
4. **Install to Workspace**
5. Copy the **Bot Token** `xoxb-...`
6. Invite the bot to your channel: `/invite @GrootBot`

## Development Conventions

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Using `eslint-config-next` with custom config in `eslint.config.mjs`
- **Formatting**: Consistent indentation and spacing
- **Naming**: PascalCase for components, camelCase for variables/functions

### Architecture Patterns

- **Server Actions**: All database operations are in `lib/*.ts` files marked with `"use server"`
- **NO Direct DB Queries in Pages**: Pages should NEVER import Prisma directly - always use Server Actions from `lib/`
- **Client Components**: Form logic uses `"use client"` directive
- **Authentication**: NextAuth.js with JWT sessions
- **Database**: Prisma ORM with Neon serverless PostgreSQL
- **Schema Management**: All database schemas are defined in `prisma/schema.prisma`
- **Database Hook**: When modifying the schema or anything database-related, always check dependencies and update them accordingly

### Data Fetching Architecture

**✅ CORRECT Pattern (Server Actions):**
```typescript
// lib/equipe-actions.ts
"use server";
import { prisma } from "./prisma";

export async function getTeamsData() {
  const teams = await prisma.teams.findMany({
    include: { users: true }
  });
  return teams;
}

// app/dashboard/equipe/page.tsx
import { getTeamsData } from "@/lib/equipe-actions";

export default async function EquipePage() {
  const teams = await getTeamsData();
  return <div>{/* render teams */}</div>;
}
```

**❌ INCORRECT Pattern (Direct DB in Pages):**
```typescript
// app/dashboard/equipe/page.tsx
import { prisma } from "@/lib/prisma"; // ❌ NO!

export default async function EquipePage() {
  const teams = await prisma.teams.findMany(); // ❌ NO!
  return <div>{/* render teams */}</div>;
}
```

### Why Server Actions?

1. **Reusability**: Actions can be used from multiple pages/components
2. **Separation of Concerns**: Business logic separated from UI
3. **Type Safety**: Centralized types and validation
4. **Testability**: Easier to test isolated functions
5. **Security**: Database credentials never exposed to client

### Testing Practices

- Manual testing via the UI
- API endpoints can be tested via direct HTTP requests
- Database queries should be verified in Neon dashboard

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/*` | Various | NextAuth authentication |
| `/api/cron/remind` | GET | Send daily reminder to Slack channel |
| `/api/cron/chase` | GET | Send follow-up DMs to absent members |
| `/api/cron/summary` | GET | Send nightly summary to boss |
| `/api/ping` | GET | Health check |
| `/api/slack/*` | Various | Slack integration endpoints |
| `/api/upload/*` | Various | File upload endpoints |

## User Flow

```
1. User visits homepage → Sees welcome screen
2. User clicks "Start" → Enters name (autocomplete from teams table)
3. System checks: Name exists + No prior submission today
4. User selects projects → Loads associated tasks
5. User selects completed tasks (optional)
6. User answers text questions (challenges, learnings, goals)
7. User reviews all answers → Can edit or submit
8. On submit: Report saved to DB + DM sent to boss
9. Success screen with confetti animation
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Prisma schema - defines all database models |
| `lib/prisma.ts` | Prisma client singleton with global caching |
| `lib/*-actions.ts` | Server Actions - all database operations go here |
| `auth.ts` | NextAuth configuration with credentials provider |
| `middleware.ts` | Route protection based on auth status and role |
| `lib/permissions.ts` | Role-based permission matrix |
| `components/DailyForm/index.tsx` | Main form component with state management |
| `components/DailyForm/questions.ts` | Question definitions and brand color |

## Database Management with Prisma

### Important Hook
**CRITICAL**: Whenever you modify the schema or anything database-related, you MUST:
1. Update `prisma/schema.prisma` first
2. Run `npx prisma db push` to sync the database
3. Check all dependencies and update related code
4. Run `npx prisma generate` if needed (automatic with db push)

### Common Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Push schema changes to database (development)
npx prisma db push

# Create a new migration (production)
npx prisma migrate dev --name description_of_changes

# Pull schema from existing database
npx prisma db pull

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Prisma Query Examples

```typescript
// Import Prisma client
import { prisma } from "@/lib/prisma";

// Find many with conditions
const users = await prisma.users.findMany({
  where: {
    email: { contains: "example", mode: 'insensitive' }
  },
  include: { team: true },
  orderBy: { created_at: 'desc' }
});

// Create with relation
await prisma.teams.create({
  data: {
    first_name: "John",
    last_name: "Doe",
    users: {
      create: {
        email: "john@example.com",
        password: hashedPassword
      }
    }
  }
});

// Array operations
const tasks = await prisma.tasks.findMany({
  where: {
    assigned_to: { has: userId }  // Check if array contains value
  }
});
```

## Important Architectural Rules

### 🚨 Critical Rules (MUST FOLLOW)

1. **NO Direct DB Queries in Pages**: Pages (in `app/`) must NEVER import `prisma` directly
   - ✅ Always create Server Actions in `lib/*-actions.ts`
   - ✅ Pages import and call these Server Actions
   - ❌ NEVER `import { prisma } from "@/lib/prisma"` in page files

2. **Database Schema Management**:
   - All schemas MUST be defined in `prisma/schema.prisma`
   - After schema changes: Run `npx prisma db push` to sync database
   - Always check and update dependent code

3. **Server Actions Pattern**:
   - All files with DB operations MUST start with `"use server"`
   - Export typed functions with clear return types
   - Handle errors gracefully with try/catch

4. **File Naming Convention**:
   - Server Actions: `lib/*-actions.ts` (e.g., `equipe-actions.ts`, `task-actions.ts`)
   - Use descriptive names based on domain/feature

## Qwen Added Memories
- Pour ouvrir le projet dans le navigateur, il faut toujours tuer le serveur existant avant de le redémarrer
- **Database ORM**: We use Prisma exclusively - all schemas are defined in `prisma/schema.prisma`
- **NO Drizzle**: Drizzle ORM has been removed from the project
- **Architecture**: Pages NEVER query the database directly - always use Server Actions from `lib/`
- Architecture preference pour les flows métier (CRUD) : 1) Server Actions avec auth() + permissions (requireTeamManagement), 2) Validation inputs côté server, 3) Pagination serveur avec params, 4) API route pour SWR, 5) Client avec useSWR + mutate() pour refresh auto, 6) Pages jamais de DB direct - toujours via Server Actions. Pattern appliqué : Equipe, Rapports, Tasks, Projects.
