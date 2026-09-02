# 🐾 PawID — Pet ID & Community Hub

A hackathon MVP: QR-code pet tags, lost & found alerts, a community feed, and
an admin dashboard. **No AI, no paid APIs** — everything runs on Firebase's
free (Spark) plan plus deterministic (rule-based) logic.

---

## 1. Setup (15–20 minutes)

### a) Create a free Firebase project
1. Go to https://console.firebase.google.com → **Add project** (the free
   Spark plan is enough for a hackathon).
2. In the project, go to **Build → Authentication → Get started** → enable
   the **Email link (passwordless sign-in)** provider under Email/Password.
3. Go to **Build → Firestore Database → Create database** → start in
   **production mode** (we'll paste our own security rules next) → pick any
   region.
4. Go to **Build → Storage → Get started** → production mode, same region.
5. Go to **Project settings (gear icon) → General → Your apps → Add app →
   Web (`</>`)**. Register the app (no need for Firebase Hosting). Copy the
   `firebaseConfig` values shown — you'll need them next.

### b) Configure the app
```bash
cp .env.local.example .env.local
# the example is prefilled for the pawidhack Firebase project
```

### c) Deploy the security rules
The two rules files in `firebase/` lock the app down the same way the old
RLS policies did (public pet profiles, owner-only edits, admin overrides).

**Easiest path (no CLI):**
1. Firestore Database → **Rules** tab → paste in the contents of
   `firebase/firestore.rules` → **Publish**.
2. Storage → **Rules** tab → paste in the contents of
   `firebase/storage.rules` → **Publish**.

**Or with the Firebase CLI**, if you have it installed:
```bash
firebase deploy --only firestore:rules,storage
```

### d) Install & run
```bash
npm install
npm run dev
```
Visit http://localhost:3000

### e) Sign in and make yourself an admin
1. Sign in once through the app (magic link — check your inbox, click the
   link, it'll bounce you through `/auth/complete` back to `/dashboard`).
2. In Firebase Console → Firestore Database → `profiles` collection → find
   your doc (its ID is your Firebase Auth UID, visible under
   Authentication → Users) → set the `isAdmin` field to `true`.

### f) Add your domain(s) to Firebase's authorized list
Firebase only lets email-link sign-in complete on domains you've approved.
`localhost` is allowed by default. Once you deploy to Vercel (next
section), add your Vercel domain(s) too:
**Authentication → Settings → Authorized domains → Add domain**.

### g) Deploy to Vercel
This app runs entirely on Firebase's **client SDK** (no Admin SDK, no
server-only Node APIs), so it deploys to Vercel with zero special
configuration — it's a standard Next.js app as far as Vercel is concerned.

1. Push to GitHub → import the repo into Vercel.
2. If Vercel asks for a root directory, select `pet-id-hub` (the folder
   containing `package.json`).
3. In **Vercel → Project Settings → Environment Variables**, add all 6
   `NEXT_PUBLIC_FIREBASE_*` vars from your `.env.local`. Apply them to
   **all three environments** (Production, Preview, and Development) —
   preview deployments need Firebase access too, not just production.
4. **Don't** set `NEXT_PUBLIC_SITE_URL` in Vercel. Leave it unset there —
   `next.config.js` auto-derives it from Vercel's own `VERCEL_URL` system
   variable at build time, so it's automatically correct for *both* your
   production domain and every preview deployment's unique URL, with no
   manual step per deploy. (It only falls back to `.env.local`'s value,
   or `localhost`, when `VERCEL_URL` isn't present — i.e. when running
   locally.)
5. Deploy. Then go back to step (f) and add the resulting domain(s) to
   Firebase's authorized list:
   - Your production domain (e.g. `pawid.vercel.app` or a custom domain)
     — add this once.
   - Preview deployments get a **new unique domain per branch/PR**
     (e.g. `pawid-git-feature-x-yourteam.vercel.app`). Firebase has no
     wildcard support, so email-link sign-in will only work on preview
     URLs you've individually added. For the hackathon demo itself,
     just make sure your **production domain** is authorized — that's
     the one judges will see. Add specific preview URLs only if you
     need to test a branch before merging.

### First-run note: composite indexes
Two queries in this app (the dashboard's pet list, and the community feed)
combine a `where` with an `orderBy` on a different field, which Firestore
requires a composite index for. The first time you hit one, Firebase will
throw an error in the browser console with a **direct link that creates
the exact index for you in one click**. Click it, wait about a minute, and
retry. Details in `firebase/data-model.md`.

---

## 2. What's inside

| Feature | Where |
|---|---|
| Passwordless email-link auth | `app/login`, `app/auth/complete` |
| Pet profile creation + photo upload | `app/dashboard/pets/new` |
| Pet management (QR, lost mode, health log, badges) | `app/dashboard/pets/[id]` |
| Dynamic QR generator + printable tag | `components/QRCodeBlock.tsx` |
| Public no-login finder page | `app/pets/[id]` |
| Manual (non-AI) stray photo comparison | inside `app/pets/[id]` |
| Community feed + broadcast alert banners | `app/community` |
| Admin dashboard (stats, moderation, manual broadcast) | `app/admin` |
| Rule-based breed care tips (no AI, instant, free) | `lib/careTips.ts` |
| Firestore + Storage security rules | `firebase/firestore.rules`, `firebase/storage.rules` |
| Data model reference (Firestore is schemaless) | `firebase/data-model.md` |

## deployment url
https://pet-id-hub.vercel.app/

**Why no AI, and why it doesn't hurt the demo:**
- The "visual verification" feature is a manual side-by-side photo grid —
  a finder uploads a photo and compares it by eye against currently-lost
  pets. This is *more* reliable live on stage than a flaky AI model call,
  and costs nothing to run.
- "Breed-specific care tips" are a deterministic lookup table keyed by
  species/breed/age, rotating daily — genuinely dynamic-feeling, zero API cost.
- Everything else (auth, database, storage) runs on Firebase's free Spark
  plan, which comfortably covers a hackathon's traffic.

**Why Firebase instead of a relational database:**
- Badges live as an array field directly on each pet document instead of a
  join table — Firestore has no joins, so a bounded set like this is
  modeled as an array.
- The community feed stores the author's name directly on each post
  (denormalized at write time) instead of joining to a users table at read
  time — standard Firestore practice.
- See `firebase/data-model.md` for the full collection reference.

---

## 3. Rapid demo strategy (10-minute presentation slot)

**Suggested flow (aim for ~6 min demo + 1 min pitch, leaving buffer for Q&A):**

1. **(30s) Hook:** "Every year millions of pets go missing. PawID turns any
   collar into a smart ID — no app download needed for the person who finds them."
2. **(1 min) Create a pet:** Sign in → Add pet → show photo upload, medical
   notes, emergency contact.
3. **(1 min) Show the QR tag:** Open the pet page → show the generated QR →
   click "Print QR tag" to show the print-ready collar tag.
4. **(1.5 min) The core moment — Lost Mode:** Toggle a pet to "Lost" →
   switch to an incognito/phone browser → scan or open the public QR link →
   show the urgent banner, contact info, and "send location" form (this is
   the emotional core of the demo).
5. **(1 min) Community:** Show the auto-generated lost alert appear in the
   feed, then post a quick community update.
6. **(1 min) Admin dashboard:** Show live analytics (total pets, scans,
   currently-lost count) and the manual broadcast control.
7. **(30s) Close:** Impact framing — "One QR code, printed for pennies,
   could be the difference in getting a pet home in hours instead of weeks."

**Before presenting:**
- Pre-seed 2–3 demo pets (one already marked "lost") so you're not typing
  live under time pressure.
- Have the public QR page open on a second device/tab so the "finder"
  experience is instant, not simulated.
- The magic-link email can take a minute to arrive on some providers —
  send it to yourself a few minutes before you go on stage, not live.

---

## 4. Fast follow-ups if you have extra time before the deadline

Roughly in priority order for judge-visible impact:
1. Add a simple map pin on the public lost page (Leaflet + OpenStreetMap —
   both free, no API key).
2. Add live-updating toasts when a broadcast alert fires while a user has
   the app open (Firestore's `onSnapshot` listener — already free, just
   swap a `getDocs` call for a real-time subscription).
3. Add pagination/infinite scroll to the community feed.
4. Add a "nearby" filter on the community feed using the `city` field on profiles.
