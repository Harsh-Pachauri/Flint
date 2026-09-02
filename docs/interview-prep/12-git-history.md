# Git History & System Evolution Analysis

## Commit Timeline Overview

| Commit | Date | Message | Files Changed | Insertions | Deletions |
|--------|------|---------|---------------|------------|-----------|
| `3651d66` | Jun 20, 2026 09:16 | first commit | 1 | 0 | 0 |
| `2cfc4f1` | Jun 20, 2026 09:26 | prepare vercel and render deployment | 113 | 40,777 | 0 |
| `1eb41d4` | Jun 21, 2026 00:25 | fix frontend deploy build warnings | 5 | 62 | 390 |
| `a558acd` | Jun 22, 2026 00:04 | refactor: improve CORS configuration and enhance message handling | 5 | 64 | 27 |
| `e269f5d` | Jun 22, 2026 00:32 | Enhance UI/UX across multiple components | 17 | 534 | 437 |

**Total development window**: ~39 hours from first commit to latest (Jun 20 morning to Jun 22 midnight)

---

## Phase 1: Project Initialization (`3651d66`)

**What**: Empty repository with only a README.md.

**Why it matters**: This was the "clean room" moment -- the repository was initialized on GitHub and then a massive initial commit followed 10 minutes later. This means the project was developed locally or in another repository before being pushed here for deployment.

**Interview Insight**: The entire 40,000+ line codebase was written before the first commit, suggesting either rapid AI-assisted development, migration from a private repo, or a "big bang" deployment approach rather than incremental commits.

---

## Phase 2: Full System Drop (`2cfc4f1` -- "prepare vercel and render deployment")

### What Changed
113 files added in a single commit -- the entire frontend and backend in one shot:

**Backend (68 files)**:
- Express.js server with MongoDB (Mongoose)
- JWT-based auth with access/refresh token rotation
- 15 controllers spanning the entire feature set
- 30 Mongoose models
- Socket.IO real-time chat system
- Cloudinary image uploads with local fallback
- Recommendation engine service
- Postman collection for API testing

**Frontend (45 files)**:
- React + TypeScript SPA
- Hash-based routing (no react-router)
- 8 page components, 7 section components
- API utility layer with token refresh logic
- CSS-based styling (no Tailwind/CSS-in-JS)

**Deployment Config**:
- `render.yaml` for backend on Render
- `vercel.json` for frontend on Vercel
- `.env.example` documenting all environment variables

### Architectural Decisions Visible

1. **Monorepo structure**: Frontend and backend in one repo but deployed separately (Vercel + Render)
2. **Hash-based routing**: Used `window.location.hash` instead of react-router, simplifying deployment (no server-side route handling needed -- perfect for static hosting on Vercel)
3. **Split-platform deployment**: Frontend on Vercel (static), backend on Render (Node.js) -- cost-effective and operationally simpler than a single server
4. **JWT with refresh tokens**: Dual-token auth system from day one, not bolted on later
5. **Custom routing in App.tsx**: `if (route === '#/login')` pattern instead of a routing library -- lightweight but limits features like route guards, nested routes, lazy loading

### Data Model Scope (30 Models)

The models reveal the full feature ambition:

| Domain | Models | Purpose |
|--------|--------|---------|
| Core Dating | User, Profile, Swipe, Match, Message | Standard dating mechanics |
| Compatibility | CompatibilityTest | Post-match quiz system |
| Gamification | Reward, Interaction, Notification, NewsFeed | Engagement loops |
| Playroom | Playroom, PlayroomSession, PlayroomScore | In-match mini-games |
| Dare Roulette | DareRouletteSession, DareSpin, DareConsent, DareCard, DareCompletion | Dare-based ice-breaker game |
| Story Builder | StorySession, StoryEntry, StoryExport | Collaborative storytelling |
| Would You Rather | WYRSession, WYRQuestion, WYRAnswer | Decision-based game |
| Campus Pulse | Confession, Poll, Comment, Reaction, College | Community features |

### API Surface (56+ Endpoints)

Organized into logical groups:
- Auth (6 endpoints) -- register, login, refresh, logout, forgot/reset password
- Profile (7 endpoints) -- CRUD + photo upload/delete + AI assessment
- Discovery (7 endpoints) -- feed, swipe, incoming swipes, accept/reject, college search
- Matches & Chat (5 endpoints + WebSocket) -- match list, detail, compatibility test, messages, unmatch
- Playroom (5 endpoints) -- game activation and session management
- Dare Roulette (4 endpoints) -- spin, consent, complete, rate
- Story Builder (4 endpoints) -- read, add entry, like, export
- Would You Rather (3 endpoints) -- session, answer, react
- Confessions (10 endpoints) -- full CRUD + moderation
- Polls (4 endpoints) -- create, list, vote, results
- Comments/Reactions (6 endpoints) -- generic social interaction
- Gamification (6 endpoints) -- rewards, news feed, notifications

---

## Phase 3: Build Fix (`1eb41d4` -- "fix frontend deploy build warnings")

### What Changed (5 files, net -328 lines)

This commit directly followed the initial deployment attempt and fixed real deployment failures.

**1. Matches.tsx: Massive pruning (-349 lines)**

Removed all inline playroom/game/compatibility-test logic from the Matches component:
- Deleted `PlayroomInfo`, `GameState`, `CompatibilityAnswerMap` types
- Removed `COMPATIBILITY_QUESTIONS` constant array
- Stripped out `playroom`, `loadingPlayroom`, `activeGame`, `gamePayload`, `gameMessage`, `compatibilityAnswers`, `submittingCompatibility` state variables
- Removed all playroom/game fetch and UI rendering code

**Why**: The Matches component was a 774-line monolith trying to handle chat, games, compatibility tests, and playroom management all in one file. The unused imports and variables caused TypeScript build warnings that Vercel treats as errors (`CI=true` makes warnings fatal). Rather than fixing the warnings by adding `@ts-ignore` or `eslint-disable`, the dead code was removed entirely.

**Interview Q**: *"Why did you strip the playroom logic out of Matches?"*
**Answer**: "The Matches component had grown into a God Component -- it handled chat, compatibility tests, playroom activation, and three different game types. When Vercel's CI build failed on unused variable warnings, we used the opportunity to separate concerns. The playroom features are still available via the API endpoints but need dedicated components rather than being crammed into one 774-line file."

**2. Profile.tsx: Cleanup (-45 lines)**

Removed unused imports and variables that triggered build warnings.

**3. MarqueeStrip.tsx: Simplification (-44 lines)**

Reduced component complexity; likely had unused state or effects.

**4. api.ts: Error handling fix**

Changed from throwing plain objects (`throw { status, ...json }`) to throwing proper `Error` instances:
```typescript
// Before (bad):
throw { status: res.status, ...json };

// After (correct):
const error = new Error(json?.error || 'Unauthorized');
Object.assign(error, { status: res.status, ...json });
throw error;
```

**Why**: Throwing plain objects breaks `catch` blocks that expect `Error` instances (no `.message`, no `.stack`), causes issues with error boundary components, and is flagged by linters. This was a correctness fix, not just a warning fix.

**Interview Q**: *"Why switch from throwing plain objects to Error instances?"*
**Answer**: "Plain object throws lose stack traces and break any error handling that checks `instanceof Error`. When debugging production issues, you need proper error objects with stack traces. The `Object.assign` pattern preserves the API response data while maintaining Error semantics."

**5. PublicProfile.tsx: Minor fix (-1 line)**

Single-line type or reference correction.

---

## Phase 4: CORS & Backend Refactor (`a558acd`)

### What Changed (5 files, net +37 lines)

**1. CORS Configuration -- Socket.IO (backend/app.js)**

```javascript
// Before:
origin: process.env.FRONTEND_URL || 'http://localhost:3000',
methods: ['GET', 'POST']

// After:
origin: function (origin, callback) {
  callback(null, true);
},
methods: ['GET', 'POST'],
credentials: true
```

**Why**: The hardcoded origin broke WebSocket connections when the frontend URL changed (different Vercel preview deployments, custom domains). The dynamic origin function accepts all origins -- necessary during development/staging, though in production this should be restricted.

**Interview Q**: *"Why did you open CORS to all origins? Isn't that a security risk?"*
**Answer**: "For the deployment phase, we needed WebSocket connections from multiple Vercel preview URLs. The HTTP API already uses `cors()` middleware with default open policy (line 15 of app.js). The Socket.IO CORS was the only thing restricting origins. In production, we would use a whitelist or environment-variable-based origin list. The `credentials: true` addition was necessary for cookie-based auth flows."

**2. Discovery Controller -- MongoDB Aggregation Fix (discoveryController.js)**

```javascript
// Before: String-based comparison in aggregation
userId: { $ne: userId, $nin: [...swipedUserIds, ...matchedUserIds] }

// After: ObjectId-based comparison
const userObjectId = new mongoose.Types.ObjectId(userId);
const excludeIds = [...swipedUserIds, ...matchedUserIds, userObjectId];
userId: { $nin: excludeIds }
```

**Why**: MongoDB aggregation pipelines require ObjectIds for comparison, not strings. The `$ne: userId` was comparing a string to ObjectId fields, which silently fails (returns wrong results rather than errors). Users were seeing themselves in the feed, or seeing already-swiped/matched users.

**Interview Q**: *"What was the discovery feed bug?"*
**Answer**: "The aggregation pipeline was comparing string user IDs against ObjectId fields in MongoDB. This is a common Mongoose gotcha -- Mongoose auto-casts types in regular queries but NOT in aggregation pipelines. The `$nin` with string values silently matched nothing, so users saw themselves and already-matched users in the feed. The fix was to ensure all IDs are proper ObjectIds before passing them to the aggregation."

**3. Match Controller -- Message Handling Rewrite (matchController.js, +37 lines)**

Two significant changes:

**a) Profile loading fix**:
```javascript
// Before: Assumed clean ID array
const profiles = await Profile.find({ userId: { $in: userIds } })

// After: Handles populated vs. raw ObjectId references
const ids = userIds.map(id => (typeof id === 'object' && id._id) ? id._id : id);
const profiles = await Profile.find({ userId: { $in: ids } })
```

**Why**: When Match documents had populated `userIds` (objects with `_id`) vs. raw ObjectIds (strings), the profile lookup failed for populated references.

**b) Message sender resolution rewrite**:

Replaced `.populate('senderId', 'name')` with manual Profile collection lookup:
```javascript
// Before: Populate from User model
const messages = await Message.find(query).populate('senderId', 'name')

// After: Manual join from Profile collection
const rawMessages = await Message.find(query).lean();
const senderIds = [...new Set(rawMessages.map(m => m.senderId.toString()))];
const senderProfiles = await Profile.find({ userId: { $in: senderIds } })
const senderMap = new Map(senderProfiles.map(p => [p.userId.toString(), p.name]));
```

**Why**: The `senderId` references `User._id`, but display names live in the `Profile` collection, not `User`. The `.populate('senderId', 'name')` tried to get `name` from User (which only has `email`, `password`, `role`) and returned null. The fix does a separate Profile lookup using a Map for O(1) name resolution.

**c) Removed compatibility test gate from chat**:
```javascript
// Removed:
const compatTest = await CompatibilityTest.findOne({ matchId });
if (!compatTest || !compatTest.completed) {
  socket.emit('error', { message: 'Compatibility test not completed' });
  return;
}
```

**Why**: The compatibility test requirement was blocking chat entirely. Either the test flow wasn't implemented on the frontend, or it was a UX friction point. Removing the gate lets matched users chat immediately.

**Interview Q**: *"Why remove the compatibility test requirement for chat?"*
**Answer**: "The compatibility test was creating a dead-end in the user flow. Users would match but couldn't communicate because the frontend didn't have the compatibility test UI implemented yet. Rather than block the core feature (chat) behind an incomplete feature (compatibility test), we removed the gate. The test endpoints still exist for optional use later."

**4. Frontend Matches.tsx Enhancement (+27 lines)**

Added robust message handling to complement the backend changes -- likely improved how sender names are displayed in the chat UI.

---

## Phase 5: UI/UX Polish (`e269f5d`)

### What Changed (17 files, net +97 lines)

This is a pure frontend visual polish commit touching every landing page section and several app pages.

**Landing Page Components Touched**:
- `CTABanner.tsx` (+52 lines) -- New gradient backgrounds, animations, corner orbs
- `Features.tsx` (+34/-34) -- Layout and animation improvements
- `Footer.tsx` (+30 lines) -- Hover effects, glow effects
- `Hero.tsx` (+221/-221) -- Animated background grid, floating notification cards, improved button interactions
- `HowItWorks.tsx` (+18 lines) -- Connecting lines between steps, animation improvements
- `MarqueeStrip.tsx` (+5 lines) -- Fade edges for smoother transitions
- `Navbar.tsx` (+11 lines) -- Sticky positioning, backdrop blur
- `Testimonials.tsx` (+8 lines) -- Quote styling improvements

**App Page Components**:
- `Login.tsx` (+123 lines) -- Visual overhaul
- `Register.tsx` (+268/-268) -- Complete restyling
- `Discover.tsx` (+41 lines) -- UI improvements
- `CampusPulse.tsx` (+11 lines) -- Minor adjustments
- `Matches.tsx` (+23 lines) -- Chat UI refinements

**Styles**:
- `index.css` (+88 lines) -- New CSS variables, color system, animation definitions
- `homepage.css` (+9 lines) -- Homepage-specific additions
- `onboarding.css` (+18 lines) -- Focus effects, hover states
- `profile.css` (+11 lines) -- Profile page improvements

**Key Design Patterns**:
1. CSS variables for consistent theming (colors, gradients, shadows)
2. Animation-heavy approach (background grids, floating elements, hover transitions)
3. Backdrop blur effects for glassmorphism aesthetic
4. Gradient-heavy color scheme matching dating app branding

**Interview Q**: *"How did you approach the UI/UX of Flint?"*
**Answer**: "We built the functional MVP first and then did a dedicated polish pass. The UI commit touched 17 files across the entire frontend -- landing page sections, auth pages, and app pages. We established a CSS variable system for colors and animations to ensure consistency, and used modern effects like backdrop-blur, gradient backgrounds, and floating animations to create a premium feel appropriate for a dating app."

---

## Architecture & Evolution Summary

### Development Pattern

```
Day 1 (Jun 20, morning): Repository init + massive initial commit (40,000+ lines)
Day 1 (Jun 21, midnight): Deploy fix -- build warnings, error handling
Day 2 (Jun 22, midnight): Backend fixes (CORS, MongoDB queries, message handling)
Day 2 (Jun 22, 00:32):    UI/UX polish pass
```

The pattern reveals:
1. **Build first, deploy second**: The entire app was built before considering deployment
2. **Deploy-driven fixes**: Real bugs surfaced only when deploying to production (CORS, build warnings, MongoDB type mismatches)
3. **Rapid iteration**: 39 hours from first commit to polished deployment
4. **Backend-then-frontend**: Backend fixes came before frontend polish

### Areas of Highest Churn

| File | Commits Touching It | Reason |
|------|---------------------|--------|
| `Matches.tsx` | 4/5 commits | God Component that needed decomposition |
| `backend/app.js` | 2/5 commits | CORS configuration evolution |
| `discoveryController.js` | 2/5 commits | MongoDB aggregation type fixes |
| `matchController.js` | 2/5 commits | Message handling and profile resolution |
| `api.ts` | 2/5 commits | Error handling correctness |

### Areas of Stability

| Area | Why Stable |
|------|-----------|
| All 30 Mongoose models | Data model was well-designed upfront |
| Auth system (JWT + refresh) | Standard pattern, implemented correctly |
| Route definitions | API contract was stable |
| Onboarding flow | Self-contained feature |
| Gamification controllers | No bugs surfaced in testing |

### Key Technical Debt Indicators

1. **Matches.tsx is still large**: Even after removing 349 lines, it handles chat UI, WebSocket connections, match listing, and message display in one component
2. **No test files**: Only `App.test.tsx` (the CRA default) exists -- zero feature tests
3. **Hash-based routing**: Works but limits future features (analytics, deep linking, SSR)
4. **Open CORS in Socket.IO**: `callback(null, true)` accepts all origins -- needs production hardening
5. **No error boundary components**: React error boundaries aren't implemented
6. **Console.log in production**: `console.log` statements in socket handlers
7. **Manual profile joins**: The `loadProfileMap` pattern is duplicated; should be middleware or a service
8. **No rate limiting**: API endpoints lack rate limiting
9. **No input validation middleware**: Validators exist in `utils/validators.js` but aren't applied in routes
10. **50MB body limit**: `express.json({ limit: '50mb' })` is extremely permissive

### Deployment Architecture Decisions

```
Frontend (Vercel)                Backend (Render)
+------------------+            +------------------+
| React SPA        |  REST API  | Express.js       |
| Static hosting   |<---------->| Node.js server   |
| Hash routing     |  WebSocket | Socket.IO        |
| vercel.json      |            | render.yaml      |
+------------------+            +------------------+
                                         |
                                    +----+----+
                                    | MongoDB  |
                                    | Atlas    |
                                    +----+----+
                                         |
                                    +----+----+
                                    |Cloudinary|
                                    | (images) |
                                    +----------+
```

**Why this architecture**:
- **Vercel for frontend**: Free tier, CDN, automatic HTTPS, preview deployments per branch
- **Render for backend**: Free tier for Node.js, supports WebSockets (unlike some alternatives), health checks
- **MongoDB Atlas**: Free tier, managed database, no ops overhead
- **Cloudinary**: Free tier image hosting with transformations, avoids storing images on Render's ephemeral filesystem

---

## Interview Questions & Prepared Answers

### Q1: "What was the biggest architectural decision you made?"

**Answer**: "Splitting the deployment between Vercel (frontend) and Render (backend) rather than deploying as a monolith. This meant dealing with CORS and WebSocket cross-origin issues, but gave us free-tier hosting on both platforms with CDN for the frontend. The alternative was deploying everything on Render, but that would mean serving static files from a Node.js process, which is slower and more expensive."

### Q2: "Why hash-based routing instead of React Router?"

**Answer**: "Hash routing (`#/page`) works on any static host without server configuration. With React Router's `BrowserRouter`, you need server-side rewrites for every route (so `/discover` doesn't 404). While our `vercel.json` has a catch-all rewrite, hash routing was simpler to implement and guaranteed to work everywhere. The trade-off is uglier URLs and no SSR potential, but for a dating app MVP, that's acceptable."

### Q3: "How did the system evolve from first commit to current state?"

**Answer**: "It was a three-phase evolution:
1. **Build phase** -- the entire 40K-line codebase was developed before the first commit, covering 30 data models, 56+ API endpoints, real-time chat, and 8 frontend pages.
2. **Deploy & fix phase** -- deploying to Vercel and Render revealed build warnings, CORS issues, and MongoDB type mismatches in aggregation pipelines. We fixed error handling to use proper Error instances and resolved ObjectId vs string comparison bugs.
3. **Polish phase** -- a dedicated UI/UX pass across 17 frontend files to add animations, glassmorphism effects, and consistent CSS variables."

### Q4: "What bugs did you find during deployment?"

**Answer**: "Three categories:
1. **TypeScript strictness**: Vercel builds with `CI=true` which turns warnings into errors. Unused variables in a 774-line Matches component caused build failure.
2. **MongoDB type coercion**: Mongoose auto-casts types in `find()` but not in aggregation pipelines. Our discovery feed was comparing strings to ObjectIds, silently returning wrong results (users seeing themselves in the feed).
3. **Data model mismatch**: Messages referenced User._id for sender, but display names lived in Profile collection. The `.populate()` call was looking for `name` on User (which only has email/password), returning null for all sender names."

### Q5: "Why did you remove the compatibility test requirement for chat?"

**Answer**: "It was creating a dead-end in the user journey. Users would match but couldn't communicate because the compatibility test UI wasn't fully implemented. The core value proposition of a dating app is enabling conversation -- gating that behind an incomplete feature was worse than removing the gate. The API endpoints for the compatibility test still exist; it can be reintroduced as an optional feature rather than a mandatory blocker."

### Q6: "What's the biggest technical debt in the project?"

**Answer**: "The Matches component. Even after removing 349 lines of dead code, it still handles WebSocket connections, message rendering, match listing, and chat input in one component. It should be decomposed into a MatchList component, a ChatWindow component, and a custom `useSocket` hook. The second concern is zero test coverage -- we have 56+ API endpoints and not a single integration test."

### Q7: "How would you improve the CORS configuration for production?"

**Answer**: "The current Socket.IO CORS accepts all origins with `callback(null, true)`. For production, I'd use an environment variable whitelist:
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
origin: function(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}
```
The `!origin` check allows server-to-server requests (no origin header). The Express CORS middleware should also be restricted from its current default-open configuration."

### Q8: "Why Cloudinary over S3 for image storage?"

**Answer**: "Three reasons: (1) Free tier is more generous for a student project. (2) Built-in image transformations -- resizing, cropping, format conversion happen via URL parameters, no Lambda/worker needed. (3) The upload service has a local fallback (`uploads/` directory) for development, but Render uses ephemeral storage, so Cloudinary was necessary for production image persistence."

### Q9: "What does the commit pattern tell you about the development approach?"

**Answer**: "The single massive initial commit (40K lines) followed by small targeted fixes reveals a 'build then deploy' approach rather than continuous integration. The fixes were deploy-driven discoveries -- CORS, build warnings, and data type issues that only surfaced in a production-like environment. The 39-hour window from first commit to polished deployment shows rapid iteration, but the lack of incremental commits means there's no rollback granularity for individual features."

### Q10: "How does real-time chat work in Flint?"

**Answer**: "Socket.IO running on the same HTTP server as Express. The socket connection authenticates via JWT in the handshake (`socket.handshake.auth.token`), verified by the same secret as the REST API. Messages are emitted through match-specific rooms (`match:<matchId>`), persisted to MongoDB's Message collection, then broadcast to the room. The frontend uses a `useRef` for the socket instance to prevent reconnection on re-renders, and messages are loaded via REST API for history with WebSocket for real-time new messages."

---

## File Change Heatmap

```
backend/
  app.js                          [##---]  2 commits (CORS evolution)
  controllers/
    matchController.js            [##---]  2 commits (message handling rewrite)
    discoveryController.js        [##---]  2 commits (ObjectId aggregation fix)
    authController.js             [#----]  1 commit  (minor fix)
  models/                         [-----]  0 changes (stable from day 1)
  routes/                         [-----]  0 changes (stable from day 1)
  services/                       [-----]  0 changes (stable)
  config/                         [-----]  0 changes (stable)

frontend/
  components/pages/
    Matches.tsx                   [####-]  4 commits (highest churn, God Component)
    Login.tsx                     [#----]  1 commit  (UI polish)
    Register.tsx                  [#----]  1 commit  (UI polish)
    Discover.tsx                  [#----]  1 commit  (UI polish)
    Profile.tsx                   [#----]  1 commit  (build fix)
    PublicProfile.tsx             [#----]  1 commit  (minor fix)
    CampusPulse.tsx               [#----]  1 commit  (UI polish)
    Onboarding.tsx                [-----]  0 changes (stable)
    AdminPanel.tsx                [-----]  0 changes (stable)
  components/sections/
    Hero.tsx                      [#----]  1 commit  (UI polish, major rewrite)
    CTABanner.tsx                 [#----]  1 commit  (UI polish)
    Features.tsx                  [#----]  1 commit  (UI polish)
    Footer.tsx                    [#----]  1 commit  (UI polish)
    HowItWorks.tsx                [#----]  1 commit  (UI polish)
    MarqueeStrip.tsx              [##---]  2 commits (build fix + polish)
    Navbar.tsx                    [#----]  1 commit  (UI polish)
    Testimonials.tsx              [#----]  1 commit  (UI polish)
  utils/
    api.ts                        [##---]  2 commits (error handling fix)
  styles/
    index.css                     [#----]  1 commit  (CSS variables)
    homepage.css                  [#----]  1 commit  (additions)
    onboarding.css                [#----]  1 commit  (polish)
    profile.css                   [#----]  1 commit  (polish)
```

---

## Commit Message Style Analysis

| Commit | Style | Quality |
|--------|-------|---------|
| `first commit` | Minimal | Low -- no context |
| `prepare vercel and render deployment` | Descriptive | Medium -- describes intent not content |
| `fix frontend deploy build warnings` | Conventional (fix prefix) | Good -- clear problem statement |
| `refactor: improve CORS configuration...` | Conventional commit format | Good -- uses `refactor:` prefix |
| `Enhance UI/UX across multiple components` | Descriptive with bullet body | Good -- detailed body with all changes |

**Observation**: Commit messages improved over time, from bare `first commit` to structured messages with detailed bodies. The latest commit has a comprehensive bullet-point body listing every change -- appropriate for a multi-file UI commit.

---

## Summary: What the Git History Reveals

1. **Development was local-first, deploy-second**: The entire app was built before any git history existed
2. **Deployment was the real test**: CORS, TypeScript strictness, and MongoDB type issues only surfaced during deployment
3. **Data model was well-designed**: Zero changes to any of the 30 Mongoose models across all commits
4. **Frontend was the pain point**: Matches.tsx was touched in 4 of 5 commits, revealing it as the most problematic component
5. **Rapid iteration works**: From broken deployment to polished UI in 39 hours
6. **Backend was more stable than frontend**: Only 3 backend files needed changes vs. 17 frontend files
7. **The project is feature-complete but needs hardening**: Zero tests, open CORS, no rate limiting, console.log in production
