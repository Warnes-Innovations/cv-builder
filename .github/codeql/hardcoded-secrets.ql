/**
 * @name Hardcoded secrets or API keys
 * @description Finds string literals that look like API keys, tokens, or passwords
 *              assigned to suspicious variable names.
 * @kind problem
 * @problem.severity error
 * @id cv-builder/hardcoded-secrets
 */

import python

from AssignStmt assign, Name target, StringLiteral val
where
  target = assign.getATarget() and
  val = assign.getValue() and
  (
    target.getId().toLowerCase().matches("%api_key%") or
    target.getId().toLowerCase().matches("%secret%") or
    target.getId().toLowerCase().matches("%password%") or
    target.getId().toLowerCase().matches("%token%") or
    target.getId().toLowerCase().matches("%bearer%")
  ) and
  val.getS().length() > 16 and
  not val.getS().matches("%{%}%") and
  not val.getS().matches("% %")
select assign, "Possible hardcoded secret in '" + target.getId() + "': " + val.getS().prefix(40)
