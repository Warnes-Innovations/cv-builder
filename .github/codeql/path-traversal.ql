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

  predicate isSink(DataFlow::Node sink) {
    // File open, os.path.join, os.makedirs etc.
    exists(Call c |
      (
        c.getFunc().(Name).getId() = "open" or
        c.getFunc().(Attribute).getName() = "join" or
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
