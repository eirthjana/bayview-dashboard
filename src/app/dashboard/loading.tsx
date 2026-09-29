import { Loader2 } from "lucide-react";

// Every dashboard page is rendered on the server from Supabase data, so a menu
// click used to show nothing until the whole page was ready. This renders
// inside the dashboard layout the moment the link is clicked: the sidebar and
// header stay, and the content area shows the page is on its way.
export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin text-[#0C645B] dark:text-emerald-400" />
        กำลังโหลด...
      </div>
    </div>
  );
}
