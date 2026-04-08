/**
 * @name LLM client call without timeout parameter
 * @description Finds calls to LLM client methods (generate, complete, chat,
 *              stream) that do not pass a timeout argument. LLM API calls without
 *              explicit timeouts will hang indefinitely if the provider is slow
 *              or unresponsive, blocking the request thread and leaving the UI
 *              frozen on "Reasoning...".
 * @kind problem
 * @problem.severity warning
 * @id cv-builder/llm-call-without-timeout
 */

import python

/**
 * Names of LLM generation methods across cv-builder's provider abstractions.
 */
predicate isLlmMethod(string name) {
  name =
    [
      "generate", "complete", "chat", "stream", "stream_chat", "chat_stream",
      "generate_text", "call_llm", "_call_llm", "call_with_retry",
      "_call_with_retry", "request"
    ]
}

/**
 * True if the call passes a keyword argument named `timeout`.
 */
predicate hasTimeoutArg(Call c) {
  exists(Keyword kw | kw = c.getANamedArg() | kw.getArg() = "timeout")
}

/**
 * True if the call is inside a try block that has a `TimeoutError` or
 * `requests.exceptions.Timeout` except clause — a sufficient substitute.
 */
predicate hasTimeoutExceptionHandler(Call c) {
  exists(Try t, ExceptStmt handler |
    t.contains(c) and
    handler = t.getHandler(_) and
    (
      handler.getType().(Name).getId() = "TimeoutError" or
      handler.getType().(Attribute).getName() = "Timeout" or
      handler.getType().(Name).getId() = "asyncio.TimeoutError"
    )
  )
}

from Call c, Attribute method
where
  c.getFunc() = method and
  isLlmMethod(method.getName()) and
  not hasTimeoutArg(c) and
  not hasTimeoutExceptionHandler(c)
select c,
  "LLM call to '" + method.getName()
    + "' has no timeout argument and no TimeoutError handler. "
    + "The UI may freeze if the provider is slow."
