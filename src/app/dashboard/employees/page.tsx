import { createClient } from "@/lib/supabase/server";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { EmployeesTable } from "@/components/employees/employees-table";
import type { EmployeeRegistry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmployeesPage() {
  let employees: EmployeeRegistry[] = [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(EMPLOYEE_TABLE)
      .select("*")
      .order("emp_id", { ascending: true });

    if (!error && data) {
      employees = data;
    }
  } catch (error) {
    console.error(`Failed to fetch ${EMPLOYEE_TABLE} from Supabase:`, error);
    employees = [];
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <EmployeesTable employees={employees} table={EMPLOYEE_TABLE} />
    </div>
  );
}
