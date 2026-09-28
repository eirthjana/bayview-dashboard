import { redirect } from "next/navigation";

export default function AdminManageRedirectPage() {
  redirect("/dashboard/admins");
}
