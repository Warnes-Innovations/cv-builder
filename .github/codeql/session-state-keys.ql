/**
 * @name Session state key accesses
 * @description Lists all string keys used to access conversation.state or session state.
 *              Used to audit that no undocumented state keys are introduced.
 * @kind problem
 * @problem.severity recommendation
 * @id cv-builder/session-state-keys
 */

import python

from Subscript sub, StringLiteral key
where
  sub.getIndex() = key and
  (
    sub.getObject().(Attribute).getName() = "state" or
    sub.getObject().(Name).getId().matches("%state%")
  )
select sub, "State key: '" + key.getS() + "'"
