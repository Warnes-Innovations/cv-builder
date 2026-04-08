/**
 * @name Flask route inventory
 * @description Lists all Flask route definitions with their URL patterns and function names.
 *              Useful for auditing that every route goes through _get_session().
 * @kind problem
 * @problem.severity recommendation
 * @id cv-builder/flask-routes
 */

import python
import semmle.python.frameworks.Flask

from Flask::FlaskRouteSetup route, Function handler
where handler = route.getARequestHandler()
select handler,
  "Route handler '" + handler.getName() + "' handles '" + route.getUrlPattern() + "'"
