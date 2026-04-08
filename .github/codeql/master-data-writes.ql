/**
 * @name Master CV data writes
 * @description Finds every location that writes to master_data, master_cv_data,
 *              or Master_CV_Data.json. During job customization these writes are
 *              forbidden outside of phase==init and phase==refinement windows.
 * @kind problem
 * @problem.severity warning
 * @id cv-builder/master-data-writes
 */

import python

// Match subscript assignment like master_data['key'] = ...
// or write_json(master_data, ...) or similar save calls

from AssignStmt assign, Subscript sub
where
  sub = assign.getATarget() and
  (
    sub.getObject().(Name).getId().matches("%master%data%") or
    sub.getObject().(Name).getId().matches("%master_cv%")
  )
select assign, "Write to master data: " + sub.getObject().(Name).getId()
