/**
 * @name Exception caught but not logged
 * @description Finds except blocks that catch exceptions but contain no logging
 *              call (logger.*, logging.*, app.logger.*). Silent exception handlers
 *              hide bugs and make incidents hard to diagnose.
 * @kind problem
 * @problem.severity warning
 * @id cv-builder/unlogged-exceptions
 */

import python

/**
 * True if the handler body transitively contains a logging/print call.
 */
predicate hasLoggingCall(ExceptStmt handler) {
  exists(Call c, Attribute attr |
    handler.getBody().contains(c) and
    c.getFunc() = attr and
    attr.getName() =
      ["error", "warning", "warn", "info", "debug", "exception", "critical", "log"]
  )
  or
  exists(Call c |
    handler.getBody().contains(c) and
    c.getFunc().(Name).getId() = "print"
  )
}

/**
 * True if the handler body re-raises the exception.
 */
predicate hasRaise(ExceptStmt handler) {
  exists(Raise r | handler.getBody().contains(r))
}

/**
 * True if the body is nothing but a bare pass (covered by swallowed-exceptions.ql).
 */
predicate isJustPass(ExceptStmt handler) {
  handler.getBody().getAnItem() instanceof Pass and
  not exists(Stmt s | handler.getBody().getAnItem() = s and not s instanceof Pass)
}

from ExceptStmt handler
where
  not hasLoggingCall(handler) and
  not hasRaise(handler) and
  not isJustPass(handler)
select handler,
  "Exception caught but not logged (no logger.*/logging.* call, no re-raise). Catches: "
    + concat(string t | t = handler.getType().(Name).getId() | t, ", ")
