# Feature Roadmap

**Created:** 2026-03-18 | **Last updated:** 2026-03-18

This document tracks planned features that are intentionally deferred from current implementation scope.
Items here are approved in concept but not yet scheduled for development.

---

## Future Features

### ROAD-01 — Multi-User Server Mode

**Priority:** Low
**Depends on:** ROAD-01 requires multiple concurrent sessions (now complete — `SessionRegistry` implemented) as a prerequisite.

**Description:**
Support multiple distinct users accessing a shared cv-builder server instance, each with their own
isolated sessions, data, and Master CV. Currently the app is single-user (one person, one local machine).

**Scope of change:**
- User identity layer: login/auth (even simple — e.g., HTTP Basic or local accounts)
- Per-user data directories (`~/CV/files/<user>/` or configurable)
- Per-user Master CV and publications files
- Session registry scoped by user identity
- UI: user indicator, logout, account switching

**Why deferred:**
The app is designed as a local single-user tool. Multi-user support requires authentication
infrastructure that adds significant complexity and security surface area. The immediate need
is multiple concurrent sessions for a single user (multiple browser tabs / job applications).

**Acceptance criteria (when this is implemented):**
- Two users can log in concurrently with fully isolated sessions and data
- One user cannot access another user's sessions, Master CV, or generated files
- Existing single-user deployments continue to work without configuration changes

---
