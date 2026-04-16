# SCU Theta Tau API Documentation

This API allows authorized applications to fetch publicly-safe data about brothers and leadership.

## Base URL
`https://www.scuthetatau.com/api/`

## Endpoints

### 1. Get All Brothers
Returns a list of all brothers sorted by last name.

- **URL**: `/brothers`
- **Method**: `GET`
- **Success Response**: 
  - **Code**: 200
  - **Content**: `[{ "firstName": "John", "lastName": "Doe", ... }]`

---

### 2. Get Leadership
Returns the Executive Board and other leadership positions.

- **URL**: `/leadership`
- **Method**: `GET`
- **Success Response**: 
  - **Code**: 200
  - **Content**: `{ "executiveBoard": [...], "otherLeadership": [...] }`

---

### 3. Get Users by Role
Returns brothers with a specific role.

- **URL**: `/role/[role_name]`
- **Method**: `GET`
- **Example**: `/api/role/regent`
- **Success Response**: 
  - **Code**: 200
  - **Content**: `[{ "firstName": "Jane", "lastName": "Smith", "role": "Regent", ... }]`

---

### 4. Get Spoon Assassins Game State
Returns the requesting user's current game state. Only returns data for the authenticated user — no other players' assignments are exposed.

- **URL**: `/spoon-assassins`
- **Method**: `GET`
- **Auth**: Required — Firebase ID token in `Authorization` header
- **Headers**:
  ```
  Authorization: Bearer <firebase_id_token>
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "userTarget": {
        "userId": "abc123",
        "firstName": "John",
        "lastName": "Doe",
        "targetId": "xyz789",
        "targetName": "Jane Smith",
        "isEliminated": false
      },
      "aliveCount": 12,
      "totalActiveCount": 15,
      "gameConfig": {
        "roundEndTime": "2025-04-20T23:59:00.000Z"
      }
    }
    ```
- **Notes**:
  - `userTarget` is `null` if the user is not enrolled in the current game
  - If `userTarget.isEliminated` is `true`, the user has been knocked out
  - `targetName` is dynamically resolved — if the original target has been eliminated, the API walks the chain server-side to return the next alive target. The original chain is never mutated, so reviving an eliminated player automatically restores the full chain
  - `targetName` will be `"YOU WON! (LAST ONE STANDING)"` if the user is the last survivor
  - `gameConfig.roundEndTime` is an ISO 8601 string, or `null` if no round timer is set
- **Error Responses**:
  - `401 Unauthorized` — missing or invalid token
  - `405 Method Not Allowed` — non-GET request
  - `500 Internal Server Error` — server-side failure

---

## Authentication & Setup
The API requires a **Firebase Service Account** to be configured in Vercel.

1. Generate a Service Account JSON in Firebase Console.
2. Add it to Vercel as `FIREBASE_SERVICE_ACCOUNT` environment variable.

## Security
- All endpoints are **Read-Only** (GET).
- Sensitive fields like `email` and private contact info are excluded from responses.
