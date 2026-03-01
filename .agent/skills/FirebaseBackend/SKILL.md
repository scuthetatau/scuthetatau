---
name: FirebaseBackend
description: Overview of the Firebase project structure, Firestore collections, and authentication logic for the SCU Theta Tau website.
---

# Firebase Backend Structure

This documentation provides an overview of how the Firebase backend is organized for the SCU Theta Tau website, including Firestore collections, schemas, authentication roles, and API interactions.

## Firestore Collections

### `users` & `alumni`
These collections now share a unified schema to ensure no data is lost when converting members between active and alumni states.
- **Shared Fields**:
    - `email`: User's primary email address (preserved in alumni state).
    - `firstName`, `lastName`: Member's full name.
    - `class`: Pledging class (e.g., "Alpha Alpha").
    - `graduationYear`: Year of graduation.
    - `family`: Associated family (e.g., "Filthy Fam", "Clout Fam").
    - `major`: Academic major.
    - `role`: Current or past leadership role.
    - `points`: Total points earned (preserved in alumni state).
    - `profilePictureUrl`: URL to the member's photo in Firebase Storage.
    - `bigId`: ID of the member's Big Brother (referenced from `users` or `alumni`).
    - `linkedinUrl`: Professional LinkedIn profile link.
    - `dropped`: Boolean indicating if the member dropped (defaults to `false` for active users).

### `admins`
Used to sync user roles for Firestore security rules (keyed by email).
- **Key Fields**:
    - `role`: The user's role.
    - `userId`: The Firestore ID of the user in the `users` collection.

### `events`
Stores information about point-earning activities.
- **Key Fields**:
    - `id`: Unique event ID.
    - `name`: Name of the event.
    - `quarter`: The quarter the event took place (e.g., "Spring 25").
    - `date`: ISO timestamp of the event.

### `eventPoints`
A matrix mapping users to the points they earned for specific events (keyed by `userId`).
- **Data Structure**: `{ [eventId]: points }`

### `quarterConfigs`
Settings for how points are calculated for a given quarter (keyed by quarter name).
- **Key Fields**:
    - `counts`: Boolean indicating if points from this quarter should be included in the total.

---

## Authentication & Authorization

### Permissions System
Permissions are managed in `src/components/Admin/auth.js` and are mapped to specific roles.

| Role | Permissions |
| :--- | :--- |
| **Webmaster** | `user-management`, `bro-dates`, `scribe-editor`, `spoon-assassins` |
| **Brotherhood Chair** | `bro-dates`, `spoon-assassins` |
| **Mediation Chair** | `bro-dates` |
| **Scribe** | `scribe-editor` |

### Role Enforcement
- `checkUserRole(navigate, requiredPermission)`: A utility function used in React components to protect routes.
- `getUserPermissions(user)`: Fetches the current user's permissions based on their role in the `users` collection.

---

## API & Serverless Functions

The project uses Vercel serverless functions in the `api/` directory to fetch data from Firestore.

- `api/brothers.js`: Fetches public information for all active brothers.
- `api/leadership.js`: Fetches executive board and other leadership information.
- `api/_lib/firebaseAdmin.js`: Standard initialization for `firebase-admin` to bypass client-side Firestore limitations.

---

## Firebase Storage

- **Path**: `profilePictures/`
- **Naming Convention**: `${timestamp}_${filename}`
- **Usage**: Stores all member profile photos.
