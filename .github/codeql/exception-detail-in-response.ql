/**
 * @name Exception details exposed in HTTP response
 * @description Finds except blocks that include raw exception messages (str(e),
 *              e.args, traceback) in Flask jsonify() responses. This leaks
 *              internal paths, logic, and stack traces to API clients (OWASP A05).
 * @kind problem
 * @problem.severity error
 * @id cv-builder/exception-detail-in-response
 */

import python

/**
 * True if `node` is a reference to a caught exception variable — i.e.,
 * the `e` in `except Exception as e`.
 */
predicate isCaughtExceptionVar(Name node) {
  exists(ExceptStmt handler |
    handler.getName().(Name).getId() = node.getId() and
    handler.getBody().contains(node)
  )
}

/**
 * A call that converts an exception to a string: str(e), repr(e), e.args,
 * or format_exc() from traceback.
 */
predicate isExceptionConversion(Expr expr) {
  // str(e) or repr(e)
  exists(Call c, Name arg |
    c = expr and
    c.getFunc().(Name).getId() = ["str", "repr"] and
    arg = c.getAnArg() and
    isCaughtExceptionVar(arg)
  )
  or
  // e.args or e.message
  exists(Attribute a, Name obj |
    a = expr and
    obj = a.getObject() and
    isCaughtExceptionVar(obj) and
    a.getName() = ["args", "message", "strerror"]
  )
  or
  // traceback.format_exc() or traceback.format_tb(...)
  exists(Call c, Attribute func |
    c = expr and
    c.getFunc() = func and
    func.getName() = ["format_exc", "format_tb", "format_exception"]
  )
}

/**
 * A jsonify() or make_response() call that includes an exception detail value
 * somewhere in its arguments or a dict/str built from exception details.
 */
from Call jsonifyCall, Expr exceptionDetail
where
  // The outer call is jsonify() or similar Flask response builder
  (
    jsonifyCall.getFunc().(Name).getId() = "jsonify" or
    jsonifyCall.getFunc().(Name).getId() = "make_response"
  ) and
  // An exception-exposing expression appears directly or nested inside
  isExceptionConversion(exceptionDetail) and
  jsonifyCall.contains(exceptionDetail)
select jsonifyCall,
  "Exception detail included in HTTP response — clients can see internal error information."
