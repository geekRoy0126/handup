# Database schema

Source of truth: `prisma/schema.prisma`. Product rules that the schema supports: `docs/PRD.md` §4.

```mermaid
erDiagram
  User ||--o{ Session : hosts
  User ||--o{ SessionModerator : moderates
  User ||--o{ ApiKey : owns
  Session ||--o{ SessionModerator : has
  Session ||--o{ Guest : has
  Session ||--o{ Question : has
  Session ||--o{ Poll : has
  Guest ||--o{ Question : asks
  Guest ||--o{ Vote : casts
  Guest ||--o{ PollResponse : gives
  Question ||--o{ Vote : receives
  Question |o--o{ Question : "merged into"
  Poll ||--|{ PollOption : offers
  Poll ||--o{ PollResponse : collects
  PollOption ||--o{ PollResponse : chosen_in

  User {
    string id PK
    string email UK
    string name
    string passwordHash
    datetime createdAt
  }
  Session {
    string id PK
    string code UK "6 chars, PRD 4.1"
    string title
    enum status "LIVE | ENDED"
    string hostId FK
    datetime createdAt
    datetime endedAt
  }
  SessionModerator {
    string sessionId PK,FK
    string userId PK,FK
    datetime addedAt
  }
  Guest {
    string id PK
    string sessionId FK
    string displayName "nullable"
    datetime createdAt
  }
  Question {
    string id PK
    string sessionId FK
    string authorId FK
    string body "3-300 chars"
    bool isAnonymous
    enum status "OPEN | ANSWERED | MERGED"
    bool isPinned
    bool isHidden
    string mergedIntoId FK "nullable"
    datetime createdAt
    datetime answeredAt
  }
  Vote {
    string questionId PK,FK
    string guestId PK,FK
    datetime createdAt
  }
  Poll {
    string id PK
    string sessionId FK
    enum kind "MULTIPLE_CHOICE | CONFIDENCE"
    string prompt
    enum status "OPEN | CLOSED"
    datetime createdAt
    datetime closedAt
  }
  PollOption {
    string id PK
    string pollId FK
    string label
    int position "unique per poll"
  }
  PollResponse {
    string pollId PK,FK
    string guestId PK,FK
    string optionId FK
    datetime updatedAt
  }
  ApiKey {
    string id PK
    string ownerId FK
    string name
    string prefix "first 8 chars"
    string hash UK "SHA-256"
    datetime createdAt
    datetime lastUsedAt
    datetime revokedAt
  }
```

## Design decisions

| Decision | Why |
| --- | --- |
| Composite primary keys on `Vote (questionId, guestId)` and `PollResponse (pollId, guestId)` | The database itself guarantees one vote per guest per question and one answer per poll, even under concurrent requests |
| Guests are rows, not users | Audience members need identity (one vote, rate limit, "your question") without an account or email |
| Host/moderator are relationships, not a global role column | The same person can host one session and moderate another |
| `mergedIntoId` self-relation + `MERGED` status | Merges keep history for the report instead of deleting rows |
| Only the hash of an API key is stored | A database leak does not leak usable keys |
| Indexes on `(sessionId, status)` and `(authorId, createdAt)` | Board queries and the 60-second rate-limit count |
| `onDelete: Cascade` from Session | Deleting a session removes everything that belongs to it |
