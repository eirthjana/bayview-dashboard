import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { EmployeesTable } from "@/components/employees/employees-table";
import type { EmployeeRegistry, LinkRequest } from "@/lib/types";
import { fetchLinkRequests } from "@/lib/link-requests-query";
import { LoadErrorBanner } from "@/components/dashboard/load-error-banner";

export const metadata: Metadata = { title: "จัดการพนักงาน" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmployeesPage() {
  let employees: EmployeeRegistry[] = [];
  let linkRequests: LinkRequest[] = [];
  let loadError = false;
  let requestsLoadError = false;

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from(EMPLOYEE_TABLE)
      .select("*")
      .order("emp_id", { ascending: true });

    if (error) throw error;
    employees = data ?? [];
  } catch (error) {
    console.error(`Failed to fetch ${EMPLOYEE_TABLE} from Supabase:`, error);
    employees = [];
    loadError = true;
  }

  try {
    linkRequests = await fetchLinkRequests(supabase, EMPLOYEE_TABLE);
  } catch (error) {
    console.error("Failed to fetch link_requests from Supabase:", error);
    requestsLoadError = true;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {loadError && <LoadErrorBanner what="รายชื่อพนักงาน" />}
      {requestsLoadError && <LoadErrorBanner what="คำขอยืนยันตัวตน" />}
      <EmployeesTable
        employees={employees}
        table={EMPLOYEE_TABLE}
        loadFailed={loadError}
        linkRequests={linkRequests}
        requestsLoadFailed={requestsLoadError}
      />
    </div>
  );
}
