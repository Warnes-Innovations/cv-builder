/**
 * @name Path traversal in file operations
 * @description Detects user-controlled data flowing into file system operations
 *              without sanitization — classic path traversal (OWASP A01).
 * @kind path-problem
 * @problem.severity error
 * @id cv-builder/path-traversal
 */

import python
import semmle.python.dataflow.new.DataFlow
import semmle.python.dataflow.new.TaintTracking
import semmle.python.dataflow.new.RemoteFlowSources

module PathTraversalConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    // Any remote/user-controlled data source (Flask request args, JSON body, etc.)
    source instanceof RemoteFlowSource
  }

  /**
   * Sanitized by helper functions that constrain paths to a known root:
   *   - _resolve_session_path(root, path) — resolves and checks relative_to(root)
   *   - _resolve_backup_path(dir, filename) — uses werkzeug safe_join + regex check
   *   - safe_join(base, *paths) — werkzeug whitelist-based joiner
   * If these return None the callers bail out before using the path.
   */
  predicate isBarrier(DataFlow::Node node) {
    exists(Call c |
      node.asExpr() = c and
      (
        c.getFunc().(Name).getId() = ["_resolve_session_path", "_resolve_backup_path", "safe_join"] or
        c.getFunc().(Attribute).getName() = "safe_join"
      )
    )
  }

  predicate isSink(DataFlow::Node sink) {
    // File open and directory operations — constrain 'join' to os.path.join only
    exists(Call c |
      (
        c.getFunc().(Name).getId() = "open" or
        c.getFunc().(Attribute).getName() = "makedirs" or
        c.getFunc().(Attribute).getName() = "remove" or
        c.getFunc().(Attribute).getName() = "listdir"
      ) and
      sink.asExpr() = c.getAnArg()
    )
  }
}

module PathTraversalFlow = TaintTracking::Global<PathTraversalConfig>;
import PathTraversalFlow::PathGraph

from PathTraversalFlow::PathNode source, PathTraversalFlow::PathNode sink
where PathTraversalFlow::flowPath(source, sink)
select sink.getNode(), source, sink,
  "Possible path traversal: user input flows to file operation"
