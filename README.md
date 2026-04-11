# ShankTracker

A real-time golf trip scoring system built for live, on-course use.

ShankTracker tracks performance hole-by-hole across a multi-round trip, combining live data sync, relative performance modeling, and mobile-first UX into a single lightweight system.

---

## Overview

Most golf scoring tools focus on raw totals.

ShankTracker focuses on relative performance:

- how a player is performing against the course
- and more importantly, against their own expected level

The system updates in real time, allowing the group to see how the leaderboard evolves as each hole is played.

---

## Core Concepts

### Relative Performance Modeling

Each player declares an expected average score prior to the trip.

This is converted into a per-hole expectation using a par-weighted model:

scoringRate = declaredAverage / totalPar

From this:

- Expected strokes so far = sum(pars played) × scoringRate
- Pace = actual − expected
- Today = actual − course par
- Total = cumulative Pace across rounds

This allows fair comparison across players of different skill levels.

---

### Real-Time Data Flow

The app uses Firestore’s real-time listeners to drive UI updates:

- score entry → Firestore write
- Firestore → onSnapshot
- UI updates across all connected clients instantly

No polling, no refresh required.

---

### Ownership + Permission Model

Instead of role-heavy auth, the system uses a simple model:

- Player document = identity
- Claiming a player = joining the trip
- Admin = flag on player doc

Enforced at the database level via Firestore rules:

- all members can read
- only owners can edit their scorecards
- admin controls trip state and roster
- claim flow is atomic and secure

---

### Mobile-First Score Entry

The primary interaction loop is:

- open scorecard
- enter hole score
- move to next hole

Design constraints:

- one-handed use
- minimal taps
- fast correction of prior holes
- clear read-only vs editable states

---

## Features

- Live leaderboard with real-time updates
- Hole-by-hole score tracking
- Performance vs par (Today)
- Performance vs expected (Pace)
- Multi-round aggregation (Total)
- Admin-controlled roster + round setup
- Secure claim flow with Google Auth
- Read-only access to all other scorecards

---

## Architecture

Frontend:

- React (Vite)
- Component-driven screen structure
- Mobile-first layout

Backend:

- Firebase Firestore (real-time data layer)
- Firebase Auth (Google sign-in)

Data Flow:

- services/ → Firestore reads/writes
- utils/ → pure scoring + formatting logic
- onSnapshot → real-time UI sync

---

## Data Model

trips/{tripId}

players/{playerId}

- name
- declaredAverage
- isAdmin
- authUid

rounds/{roundId}

- order
- courseName
- totalPar
- holePars
- holeYardages
- date
- teeTime

scorecards/{roundId_playerId}

- holeScores
- holesCompleted
- actualTotal

Trip-level:

- memberUids: string[]
- adminUids: string[]
- currentRoundId
- averagesLocked

---

## Security Model

Firestore rules enforce:

- authenticated access required
- trip membership required for round/scorecard reads
- scorecards writable only by owner or admin
- player claim restricted to unclaimed players
- admin privileges derived from trusted server-side state (not client input)

---

## Notable Design Decisions

Single-trip focus:

- intentionally scoped to one group and one trip
- avoids premature abstraction
- keeps data model and permissions simple

Derived metrics:

- pace and relative performance computed client-side
- minimal Firestore writes
- faster iteration

Explicit backend enforcement:

- UI hides controls
- Firestore rules enforce all permissions
- no trust in client state

---

## Development

npm install  
npm run dev

---

## Status

- Core scoring system complete
- Real-time sync implemented
- Auth + claim flow implemented
- Firestore rules enforced
- Mobile UX pass in progress

---

## Next Steps

- Score-entry UX refinement
- Edge-case hardening (permissions, loading states)
- Real-world trip testing
- Optional post-trip generalization

---

## Philosophy

This project prioritizes:

- speed of iteration
- clarity of system behavior
- practical correctness over abstraction

It is not trying to model golf perfectly.

It is trying to make live competitive context obvious and actionable.

---

## Summary

ShankTracker is a small but complete system:

- real-time data pipeline
- probabilistic performance framing
- enforced permission model
- mobile-first interaction loop
