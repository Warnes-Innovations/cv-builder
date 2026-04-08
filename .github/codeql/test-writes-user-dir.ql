/**
 * @name Test writing to user data directories
 * @description Finds test functions that write files to paths derived from
 *              os.path.expanduser() or config-driven output directories
 *              without isolation (tmpdir, tmp_path, or PYTEST_TMPDIR).
 *              Tests that write to ~/CV/ pollute the user's real data directory.
 * @kind problem
 * @problem.severity warning
 * @id cv-builder/test-writes-to-user-dir
 */

import python

/**
 * True if the function is a pytest test function (starts with test_).
 */
predicate isTestFunction(Function f) {
  f.getName().matches("test_%") or
  f.getName().matches("%_test")
}

/**
 * True if the expression calls os.path.expanduser() with a ~/... string.
 */
predicate isExpandUserCall(Call c) {
  c.getFunc().(Attribute).getName() = "expanduser" and
  c.getAnArg().(StringLiteral).getS().matches("~%")
}

/**
 * True if the call opens a file for writing (mode w, a, wb, x...).
 */
predicate isFileWrite(Call c) {
  c.getFunc().(Name).getId() = "open" and
  exists(StringLiteral mode |
    (mode = c.getArg(1) or mode = c.getANamedArg().(Keyword).getValue()) and
    (
      mode.getS().matches("w%") or
      mode.getS().matches("a%") or
      mode.getS().matches("x%")
    )
  )
}

/**
 * True if there is a tmp_path or tmpdir fixture parameter in this test's signature.
 */
predicate hasTmpFixture(Function f) {
  exists(Parameter p |
    p = f.getArg(_) and
    (p.getName() = "tmp_path" or p.getName() = "tmpdir" or p.getName() = "temp_dir")
  )
}

from Function testFunc, Call problematicCall
where
  isTestFunction(testFunc) and
  not hasTmpFixture(testFunc) and
  testFunc.contains(problematicCall) and
  (isExpandUserCall(problematicCall) or isFileWrite(problematicCall))
select problematicCall,
  "Test '" + testFunc.getName()
    + "' appears to write/access a user home-dir path without tmp_path isolation. "
    + "Use tmp_path fixture or patch config.output_dir."
