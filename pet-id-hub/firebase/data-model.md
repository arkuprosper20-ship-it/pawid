# Firestore data model

Firestore is schemaless — there's no CREATE TABLE step. Collections and
fields are created the first time a document is written (the app does this
automatically as you use it). This doc is a reference for what the app
expects, mirroring `types/index.ts`.

No manual setup is required beyond enabling Firestore and Authentication in
the Firebase Console and deploying the two rules files in this folder — see
the root `README.md`.

## Collections

### `profiles/{uid}`
One doc per user, keyed by their Firebase Auth UID. Created automatically
on first sign-in (see `app/auth/complete/page.tsx`).
```
fullName: string | null
city: string | null
phone: string | null
isAdmin: boolean
createdAt: Timestamp
```

### `pets/{petId}`
```
ownerId: string          // uid of the owning profile
name: string
species: string
breed: string | null
ageYears: number | null
photoUrl: string | null
medicalNotes: string | null
emergencyContactName: string | null
emergencyContactPhone: string | null
microchipId: string | null
petIdentifier: string | null // owner-provided collar tag or pet ID number
status: "normal" | "lost"
lostSince: string | null       // ISO timestamp
rewardNote: string | null
lastSeenLocation: string | null
badges: string[]         // e.g. ["Vaccinated", "Friendly"] — an array field,
                          // not a join table, since Firestore has no joins
createdAt: Timestamp
updatedAt: Timestamp
```

### `healthLogs/{logId}`
```
petId: string
logType: "vaccination" | "weight" | "medication"
label: string
value: string | null
dueDate: string | null   // "YYYY-MM-DD"
loggedDate: string       // "YYYY-MM-DD"
createdAt: Timestamp
```

### `qrScans/{scanId}`
```
petId: string
scannedAt: Timestamp
finderMessage: string | null
finderContact: string | null
finderLat: number | null
finderLng: number | null
```

### `communityPosts/{postId}`
```
authorId: string
authorName: string | null   // denormalized from profiles at write time
petId: string | null
content: string
photoUrl: string | null
isFlagged: boolean
isRemoved: boolean
createdAt: Timestamp
```

### `broadcastAlerts/{alertId}`
```
petId: string | null
message: string
triggeredBy: string | null   // uid, null for auto-fired Lost Mode alerts
isManual: boolean
createdAt: Timestamp
```

## Required composite indexes

Firestore needs a composite index for any query that combines a `where`
with an `orderBy` on a different field. This app has two:

- `pets` — `where(ownerId ==) + orderBy(createdAt desc)` (dashboard page)
- `communityPosts` — `where(isRemoved ==) + orderBy(createdAt desc)` (community feed)

You don't need to create these by hand: the first time you run the app and
hit one of these queries, Firebase will throw an error in the browser
console with a direct link that creates the exact index for you in one
click. Click it, wait ~1 minute for the index to build, then retry.

## Why this shape differs from a relational schema

- **Badges** live as a `string[]` array field directly on the pet document
  instead of a separate join table — Firestore has no joins, and an array
  field is the idiomatic way to model a small, bounded many-to-one set like
  this.
- **`communityPosts.authorName`** is denormalized (copied) from the
  author's profile at post-creation time, instead of being looked up via a
  join at read time. This is standard Firestore practice — reads are cheap
  and frequent, so you pay a small write-time cost to avoid an extra query
  per post at read time.
