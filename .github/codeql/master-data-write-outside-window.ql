/**
 * @name Master CV data write outside permitted workflow window
 * @description Finds subscript assignments to master_data, master_cv_data, or
 *              similar variables outside of functions explicitly annotated as
 *              being in the 'init' or 'refinement' workflow windows.
 *
 *              Per architecture rules: master data may only be written during:
 *                - phase == init  (pre-job master-data window)
 *                - phase == refinement  (post-job finalise window via harvest/apply)
 *
 *              Any write outside these two windows is a bug that could corrupt
 *              the user's master CV file.
 *
 * @kind problem
 * @problem.severity error
 * @id cv-builder/master-data-write-outside-window
 */

import python

/**
 * Variable names that refer to the loaded master CV data dictionary.
 */
predicate isMasterDataVar(string name) {
  name = ["master_data", "master_cv_data", "master_cv", "cv_data"]
}

/**
 * Functions that are explicitly part of the permitted write windows:
 *   - init window: load/save master data, direct /api/master-data/* handlers
 *   - refinement window: harvest/apply endpoint
 */
predicate isPermittedWriteFunction(Function f) {
  f.getName().matches("%save_master%") or
  f.getName().matches("%update_master%") or
  f.getName().matches("%patch_master%") or
  f.getName().matches("%harvest%apply%") or
  f.getName().matches("%apply_harvest%") or
  f.getName().matches("%master_data%update%") or
  f.getName().matches("%master_data%save%") or
  f.getName().matches("%_save%") or
  f.getName().matches("%write_json%") or
  // Test helpers are permitted
  f.getName().matches("test_%") or
  f.getName().matches("%_test%") or
  f.getName().matches("%fixture%") or
  f.getName().matches("%mock%")
}

from AssignStmt assign, Subscript target, Name masterVar, Function enclosingFunc
where
  target = assign.getATarget() and
  masterVar = target.getObject() and
  isMasterDataVar(masterVar.getId()) and
  enclosingFunc = assign.getScope() and
  not isPermittedWriteFunction(enclosingFunc)
select assign,
  "Write to master CV data ('" + masterVar.getId() + "[...]') in function '"
    + enclosingFunc.getName() + "' — verify this is inside a permitted workflow window (init or refinement)."
