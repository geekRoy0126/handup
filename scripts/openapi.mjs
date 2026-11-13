#!/usr/bin/env node
// Builds public/openapi.json (OpenAPI 3.1) for every /api/v1 route. Run: npm run openapi
// tests/integration/public-api.int.test.ts fails if a route file exists that is not documented here.
import { writeFileSync } from "node:fs";

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ "application/json": { schema } });
const envelope = (dataSchema) => ({ type: "object", required: ["data"], properties: { data: dataSchema } });
const ok = (description, dataSchema, status = "200") => ({ [status]: { description, content: json(envelope(dataSchema)) } });
const obj = (properties, required = Object.keys(properties)) => ({ type: "object", required, properties });
const str = { type: "string" };
const int = { type: "integer" };
const bool = { type: "boolean" };
const dateTime = { type: "string", format: "date-time" };
const nullable = (schema) => ({ oneOf: [schema, { type: "null" }] });

const errors = (...codes) =>
  Object.fromEntries(
    codes.map((code) => [
      String(code),
      {
        description: {
          400: "Malformed request body",
          401: "Not signed in / missing or invalid key",
          403: "Signed in but not allowed",
          404: "Not found",
          409: "Conflicts with the current state",
          422: "Validation failed",
          429: "Rate limited",
        }[code],
        content: json(ref("Error")),
      },
    ]),
  );

const codeParam = { name: "code", in: "path", required: true, description: "Join code, e.g. K7Q2XM (case and dashes ignored)", schema: str };
const idParam = (name, description) => ({ name, in: "path", required: true, description, schema: str });
const body = (schema) => ({ required: true, content: json(schema) });

const user = [{ bearer: [] }, { sessionCookie: [] }];
const guest = [{ guestCookie: [] }];
const participant = [{ bearer: [] }, { sessionCookie: [] }, { guestCookie: [] }];
const apiKey = [{ apiKey: [] }];

const schemas = {
  Error: obj({ error: obj({ code: str, message: str }) }),
  User: obj({ id: str, name: str, email: { type: "string", format: "email" } }),
  AuthResult: obj({ user: ref("User"), token: { type: "string", description: "JWT; send as Authorization: Bearer" } }),
  Session: obj({ code: str, title: str, status: { enum: ["LIVE", "ENDED"] }, createdAt: dateTime, endedAt: nullable(dateTime) }),
  MySession: { allOf: [ref("Session"), obj({ role: { enum: ["HOST", "MODERATOR"] } })] },
  Question: obj({
    id: str,
    body: str,
    authorName: { ...nullable(str), description: "null when anonymous or unnamed" },
    status: { enum: ["OPEN", "ANSWERED"] },
    isPinned: bool,
    createdAt: dateTime,
    answeredAt: nullable(dateTime),
    votes: int,
    hasVoted: bool,
    isMine: bool,
    mergedCount: int,
    isHidden: { ...bool, description: "Staff only" },
  }, ["id", "body", "authorName", "status", "isPinned", "createdAt", "votes", "hasVoted", "isMine", "mergedCount"]),
  PollResults: obj({
    total: int,
    options: { type: "array", items: obj({ optionId: str, label: str, count: int, percent: { type: "integer", minimum: 0, maximum: 100 } }) },
  }),
  Poll: obj({
    id: str,
    kind: { enum: ["MULTIPLE_CHOICE", "CONFIDENCE"] },
    prompt: str,
    status: { enum: ["OPEN", "CLOSED"] },
    createdAt: dateTime,
    closedAt: nullable(dateTime),
    options: { type: "array", items: obj({ id: str, label: str }) },
    myOptionId: nullable(str),
    results: { ...nullable(ref("PollResults")), description: "Guests see results after answering or once closed" },
  }),
  Moderator: obj({ userId: str, name: str, email: str, addedAt: dateTime }),
  ApiKey: obj({ id: str, name: str, prefix: str, createdAt: dateTime, lastUsedAt: nullable(dateTime), revokedAt: nullable(dateTime) }),
  ReportQuestion: obj({ body: str, votes: int, status: { enum: ["OPEN", "ANSWERED"] }, authorName: nullable(str) }),
  Totals: obj({ guests: int, questions: int, votes: int }),
  ReportPoll: obj({ prompt: str, status: { enum: ["OPEN", "CLOSED"] }, results: ref("PollResults") }),
  SessionSummary: obj({
    session: ref("Session"),
    totals: ref("Totals"),
    topQuestions: { type: "array", maxItems: 10, items: ref("ReportQuestion") },
    unanswered: { type: "array", items: ref("ReportQuestion") },
  }),
};
schemas.Report = { allOf: [ref("SessionSummary"), obj({ polls: { type: "array", items: ref("ReportPoll") } })] };

const paths = {
  "/api/v1/health": { get: { tags: ["System"], summary: "Liveness check", security: [], responses: ok("Up", obj({ status: { const: "ok" } })) } },
  "/api/v1/auth/register": {
    post: {
      tags: ["Auth"], summary: "Create a host account", security: [],
      requestBody: body(obj({ name: { ...str, maxLength: 80 }, email: { type: "string", format: "email" }, password: { ...str, minLength: 8 } })),
      responses: { ...ok("Created; also sets the hu_session cookie", ref("AuthResult"), "201"), ...errors(409, 422) },
    },
  },
  "/api/v1/auth/login": {
    post: {
      tags: ["Auth"], summary: "Log in", security: [],
      requestBody: body(obj({ email: str, password: str })),
      responses: { ...ok("Signed in; also sets the hu_session cookie", ref("AuthResult")), ...errors(401, 422) },
    },
  },
  "/api/v1/auth/logout": { post: { tags: ["Auth"], summary: "Clear the session cookie", security: [], responses: ok("Logged out", obj({ loggedOut: bool })) } },
  "/api/v1/auth/me": { get: { tags: ["Auth"], summary: "Current user", security: user, responses: { ...ok("The user", obj({ user: ref("User") })), ...errors(401) } } },
  "/api/v1/sessions": {
    get: { tags: ["Sessions"], summary: "Sessions I host or moderate, newest first", security: user, responses: { ...ok("List", obj({ sessions: { type: "array", items: ref("MySession") } })), ...errors(401) } },
    post: {
      tags: ["Sessions"], summary: "Create a session with a join code", security: user,
      requestBody: body(obj({ title: { ...str, minLength: 3, maxLength: 80 } })),
      responses: { ...ok("Created", obj({ session: ref("Session") }), "201"), ...errors(401, 422) },
    },
  },
  "/api/v1/sessions/{code}": {
    get: {
      tags: ["Sessions"], summary: "Session info and the caller's role", security: [], parameters: [codeParam],
      responses: { ...ok("Found", obj({ session: ref("Session"), viewer: obj({ role: nullable({ enum: ["HOST", "MODERATOR", "GUEST"] }) }) })), ...errors(404) },
    },
  },
  "/api/v1/sessions/{code}/end": { post: { tags: ["Sessions"], summary: "End the session (host)", security: user, parameters: [codeParam], responses: { ...ok("Ended", obj({ session: ref("Session") })), ...errors(401, 403, 404) } } },
  "/api/v1/sessions/{code}/join": {
    post: {
      tags: ["Audience"], summary: "Join as a guest (sets the hu_guest cookie)", security: [], parameters: [codeParam],
      responses: { ...ok("Joined", obj({ guest: obj({ id: str, displayName: nullable(str) }), token: str })), ...errors(404, 409) },
    },
  },
  "/api/v1/sessions/{code}/questions": {
    get: { tags: ["Questions"], summary: "The ranked board for this viewer", security: participant, parameters: [codeParam], responses: { ...ok("Board", obj({ questions: { type: "array", items: ref("Question") } })), ...errors(401, 403, 404) } },
    post: {
      tags: ["Questions"], summary: "Ask a question (guest; 5 per minute)", security: guest, parameters: [codeParam],
      requestBody: body(obj({ body: { ...str, minLength: 3, maxLength: 300 }, displayName: { ...str, maxLength: 40 }, isAnonymous: { ...bool, default: true } }, ["body"])),
      responses: { ...ok("Asked", obj({ question: ref("Question") }), "201"), ...errors(401, 403, 404, 409, 422, 429) },
    },
  },
  "/api/v1/sessions/{code}/events": {
    get: {
      tags: ["Real time"], summary: "Server-Sent Events: `ready` and `changed` with { version }; refetch on change", security: participant, parameters: [codeParam],
      responses: { 200: { description: "text/event-stream", content: { "text/event-stream": { schema: str } } }, ...errors(401, 403, 404) },
    },
  },
  "/api/v1/sessions/{code}/moderators": {
    get: { tags: ["Moderation"], summary: "List moderators (host)", security: user, parameters: [codeParam], responses: { ...ok("List", obj({ moderators: { type: "array", items: ref("Moderator") } })), ...errors(401, 403, 404) } },
    post: {
      tags: ["Moderation"], summary: "Add a moderator by account email (host)", security: user, parameters: [codeParam],
      requestBody: body(obj({ email: { type: "string", format: "email" } })),
      responses: { ...ok("Added", obj({ moderator: ref("Moderator") }), "201"), ...errors(401, 403, 404, 409, 422) },
    },
  },
  "/api/v1/sessions/{code}/moderators/{userId}": {
    delete: { tags: ["Moderation"], summary: "Remove a moderator (host)", security: user, parameters: [codeParam, idParam("userId", "Moderator user id")], responses: { ...ok("Removed", obj({ removed: bool })), ...errors(401, 403, 404) } },
  },
  "/api/v1/sessions/{code}/polls": {
    get: { tags: ["Polls"], summary: "Polls, newest first", security: participant, parameters: [codeParam], responses: { ...ok("List", obj({ polls: { type: "array", items: ref("Poll") } })), ...errors(401, 403, 404) } },
    post: {
      tags: ["Polls"], summary: "Launch a poll (host; one open at a time)", security: user, parameters: [codeParam],
      requestBody: body({
        oneOf: [
          obj({ kind: { const: "MULTIPLE_CHOICE" }, prompt: { ...str, minLength: 3, maxLength: 200 }, options: { type: "array", minItems: 2, maxItems: 6, items: { ...str, maxLength: 80 } } }),
          obj({ kind: { const: "CONFIDENCE" }, prompt: { ...str, minLength: 3, maxLength: 200 } }),
        ],
      }),
      responses: { ...ok("Launched", obj({ poll: ref("Poll") }), "201"), ...errors(401, 403, 404, 409, 422) },
    },
  },
  "/api/v1/sessions/{code}/report": { get: { tags: ["Report"], summary: "Session report (host, moderators)", security: user, parameters: [codeParam], responses: { ...ok("Report", obj({ report: ref("Report") })), ...errors(401, 403, 404) } } },
  "/api/v1/questions/{id}": {
    patch: {
      tags: ["Moderation"], summary: "Staff action on a question", security: user, parameters: [idParam("id", "Question id")],
      requestBody: body(obj({ action: { enum: ["pin", "unpin", "answer", "reopen", "hide", "unhide"] } })),
      responses: { ...ok("Updated", obj({ question: obj({ id: str, status: str, isPinned: bool, isHidden: bool, answeredAt: nullable(dateTime) }) })), ...errors(401, 403, 404, 409, 422) },
    },
  },
  "/api/v1/questions/{id}/vote": {
    post: { tags: ["Questions"], summary: "Toggle my upvote (guest)", security: guest, parameters: [idParam("id", "Question id")], responses: { ...ok("New state", obj({ voted: bool, votes: int })), ...errors(401, 403, 404, 409) } },
  },
  "/api/v1/questions/{id}/merge": {
    post: {
      tags: ["Moderation"], summary: "Merge this question into another (staff)", security: user, parameters: [idParam("id", "Source question id")],
      requestBody: body(obj({ targetId: str })),
      responses: { ...ok("Merged", obj({ mergedId: str, targetId: str, movedVotes: int })), ...errors(401, 403, 404, 409, 422) },
    },
  },
  "/api/v1/polls/{id}/responses": {
    post: { tags: ["Polls"], summary: "Answer or change my answer (guest)", security: guest, parameters: [idParam("id", "Poll id")], requestBody: body(obj({ optionId: str })), responses: { ...ok("Answered", obj({ poll: ref("Poll") })), ...errors(401, 403, 404, 409, 422) } },
  },
  "/api/v1/polls/{id}/close": { post: { tags: ["Polls"], summary: "Close the poll (host)", security: user, parameters: [idParam("id", "Poll id")], responses: { ...ok("Closed", obj({ poll: ref("Poll") })), ...errors(401, 403, 404) } } },
  "/api/v1/api-keys": {
    get: { tags: ["Public API keys"], summary: "My API keys (no secrets)", security: user, responses: { ...ok("List", obj({ apiKeys: { type: "array", items: ref("ApiKey") } })), ...errors(401) } },
    post: {
      tags: ["Public API keys"], summary: "Create a key — the full key is returned only once", security: user,
      requestBody: body(obj({ name: { ...str, maxLength: 60 } })),
      responses: { ...ok("Created", obj({ key: { type: "string", pattern: "^hu_[0-9A-Za-z]{32}$" }, apiKey: ref("ApiKey") }), "201"), ...errors(401, 422) },
    },
  },
  "/api/v1/api-keys/{id}": { delete: { tags: ["Public API keys"], summary: "Revoke a key", security: user, parameters: [idParam("id", "Key id")], responses: { ...ok("Revoked", obj({ apiKey: ref("ApiKey") })), ...errors(401, 404) } } },
  "/api/v1/public/sessions/{code}/summary": {
    get: { tags: ["Public API"], summary: "Totals, top and unanswered questions of one of my sessions", security: apiKey, parameters: [codeParam], responses: { ...ok("Summary", ref("SessionSummary")), ...errors(401, 404) } },
  },
  "/api/v1/public/sessions/{code}/polls": {
    get: { tags: ["Public API"], summary: "Poll results of one of my sessions", security: apiKey, parameters: [codeParam], responses: { ...ok("Polls", obj({ polls: { type: "array", items: ref("ReportPoll") } })), ...errors(401, 404) } },
  },
};

const spec = {
  openapi: "3.1.0",
  info: {
    title: "HandUp API",
    version: "1.0.0",
    description:
      "REST API for HandUp (docs/PRD.md). Responses use { data } or { error: { code, message } }. " +
      "The **Public API** (/api/v1/public/**) is for course sites and bots: create a key at /settings/api-keys and send it as X-API-Key. " +
      "It only reads sessions you host, never shows hidden questions or anonymous names, and allows any origin (CORS).",
  },
  servers: [{ url: "/" }],
  security: user,
  tags: ["Public API", "Public API keys", "Auth", "Sessions", "Audience", "Questions", "Moderation", "Polls", "Report", "Real time", "System"].map((name) => ({ name })),
  paths,
  components: {
    securitySchemes: {
      apiKey: { type: "apiKey", in: "header", name: "X-API-Key" },
      bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      sessionCookie: { type: "apiKey", in: "cookie", name: "hu_session" },
      guestCookie: { type: "apiKey", in: "cookie", name: "hu_guest" },
    },
    schemas,
  },
};

writeFileSync(new URL("../public/openapi.json", import.meta.url), `${JSON.stringify(spec, null, 2)}\n`);
console.log(`public/openapi.json: ${Object.keys(paths).length} paths`);
