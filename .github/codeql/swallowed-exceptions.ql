/**
 * @name Silently swallowed exceptions (bare pass)
 * @description Finds except blocks whose entire body is a bare `pass`,
 *              meaning the exception is silently suppressed with no logging,
 *              re-raise, or any other action.
 * @kind problem
 * @problem.severity error
 * @id cv-builder/swallowed-exceptions
 */

import python

from ExceptStmt handler
where
  // Every statement in the body is a Pass (i.e., body is just `pass`)
  handler.getBody().getAnItem() instanceof Pass and
  not exists(Stmt s | handler.getBody().getAnItem() = s and not s instanceof Pass)
select handler,
  "Exception silently swallowed (bare pass). Catches: "
    + concat(string t | t = handler.getType().(Name).getId() | t, ", ")
