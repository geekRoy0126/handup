# Public API guide

The public API lets a course website, Discord bot or spreadsheet read what happened in sessions **you host**.
Full reference: `/api-docs` (Swagger UI) or [`public/openapi.json`](../public/openapi.json).

## 1. Get a key

Sign in → **API keys** (`/settings/api-keys`) → name it → **Create key**. The key looks like
`hu_` + 32 letters and digits and is shown **once**. HandUp stores only a SHA-256 hash of it. Revoke a key
on the same page at any time.

## 2. Call the API

Send the key in the `X-API-Key` header. Use the join code of one of your sessions (case and dashes don't matter).

```bash
curl -s https://<your-handup-url>/api/v1/public/sessions/K7Q2XM/summary \
  -H "X-API-Key: hu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

```json
{
  "data": {
    "session": { "code": "K7Q2XM", "title": "CS6983 Lecture 9", "status": "ENDED", "createdAt": "…", "endedAt": "…" },
    "totals": { "guests": 42, "questions": 17, "votes": 63 },
    "topQuestions": [{ "body": "How is an agent different from a chain of prompts?", "votes": 9, "status": "ANSWERED", "authorName": null }],
    "unanswered": [{ "body": "Can agents call tools in parallel?", "votes": 4, "status": "OPEN", "authorName": null }]
  }
}
```

Poll results:

```bash
curl -s https://<your-handup-url>/api/v1/public/sessions/K7Q2XM/polls -H "X-API-Key: $HANDUP_KEY"
```

From a browser (CORS is open to any origin; the key is the access control, so keep it out of public pages and
call the API from your server or bot when possible):

```js
const res = await fetch(`${HANDUP_URL}/api/v1/public/sessions/K7Q2XM/summary`, {
  headers: { "X-API-Key": process.env.HANDUP_KEY },
});
const { data } = await res.json();
console.log(data.topQuestions.slice(0, 3).map((q) => `${q.votes} ▲ ${q.body}`).join("\n"));
```

## 3. Rules and errors

| Status | When |
| --- | --- |
| 200 | `{ "data": … }` |
| 401 | Missing, malformed, unknown or revoked key |
| 404 | No such code **or** the session belongs to someone else (the same answer, so codes cannot be probed) |

Errors always look like `{ "error": { "code": "UNAUTHENTICATED", "message": "…" } }`.

The public API never returns hidden questions, merged questions or the names of anonymous askers, the same rules
as the in-app report (docs/PRD.md §4.5–4.6).
