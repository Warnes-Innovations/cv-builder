/**
 * @name Flask route without session validation
 * @description Finds Flask route handler functions that do not call _get_session()
 *              anywhere in their body. Every user-scoped route must validate the
 *              session_id to prevent cross-session data access.
 *
 *              Exceptions (routes that are intentionally session-free):
 *                - /api/sessions/new
 *                - /api/sessions/claim
 *                - /api/sessions/takeover
 *                - /api/sessions/active
 *                - /api/sessions/<id>/evict
 *                - /api/model-catalog
 *                - /api/pricing
 *                - /api/models
 *                - /api/copilot-auth/*
 *
 * @kind problem
 * @problem.severity warning
 * @id cv-builder/route-without-session
 */

import python
import semmle.python.frameworks.Flask

/**
 * Routes that are intentionally session-free per the architecture specification
 * in .github/copilot-instructions.md.
 */
predicate isSessionFreeRoute(Flask::FlaskRouteSetup route) {
  route.getUrlPattern().matches("%/sessions/new%") or
  route.getUrlPattern().matches("%/sessions/claim%") or
  route.getUrlPattern().matches("%/sessions/takeover%") or
  route.getUrlPattern().matches("%/sessions/active%") or
  route.getUrlPattern().matches("%/sessions%/evict%") or
  route.getUrlPattern().matches("%/model-catalog%") or
  route.getUrlPattern().matches("%/pricing%") or
  route.getUrlPattern().matches("%/models%") or
  route.getUrlPattern().matches("%/copilot-auth/%") or
  route.getUrlPattern().matches("%/health%") or
  route.getUrlPattern() = "/" or
  route.getUrlPattern().matches("%.html") or
  route.getUrlPattern().matches("%.js") or
  route.getUrlPattern().matches("%.css")
}

/**
 * True if the function calls _get_session() anywhere in its body.
 */
predicate callsGetSession(Function f) {
  exists(Call c |
    f.contains(c) and
    (
      c.getFunc().(Name).getId() = "_get_session" or
      c.getFunc().(Attribute).getName() = "_get_session"
    )
  )
}

from Flask::FlaskRouteSetup route, Function handler
where
  handler = route.getARequestHandler() and
  not callsGetSession(handler) and
  not isSessionFreeRoute(route)
select handler,
  "Flask route handler '" + handler.getName() + "' for '" + route.getUrlPattern()
    + "' does not call _get_session(). Add session validation or declare as session-free."
