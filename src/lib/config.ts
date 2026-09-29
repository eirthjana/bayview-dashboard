import "server-only";

// The one place the employee table is chosen. Tests run on employee_test; the
// move to production switches EMPLOYEE_TABLE to employee_registry. Anything
// else is refused so a typo can't point the app at an unrelated table.
const EMPLOYEE_TABLES = ["employee_test", "employee_registry"] as const;
export type EmployeeTable = (typeof EMPLOYEE_TABLES)[number];

function employeeTable(): EmployeeTable {
  const value = (process.env.EMPLOYEE_TABLE || "employee_test").trim();
  if (!(EMPLOYEE_TABLES as readonly string[]).includes(value)) {
    throw new Error(`EMPLOYEE_TABLE must be one of ${EMPLOYEE_TABLES.join(", ")} (got "${value}")`);
  }
  return value as EmployeeTable;
}

export const EMPLOYEE_TABLE = employeeTable();
