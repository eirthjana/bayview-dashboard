"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrentAdmin } from "@/components/dashboard/current-admin";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  Settings,
  Activity,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  IdCard,
  UploadCloud,
  BarChart3,
  MessageSquareReply,
  UserCog,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "ภาพรวม",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Analytics & Insights",
        href: "/dashboard/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "การจัดการผู้ใช้",
    items: [
      {
        label: "Employees Management",
        href: "/dashboard/employees",
        icon: IdCard,
      },
      {
        label: "Admin Manage",
        href: "/dashboard/admins",
        icon: UserCog,
      },
    ],
  },
  {
    title: "ข้อมูลบอทและการสนทนา",
    items: [
      {
        label: "SOP Documents",
        href: "/dashboard/sop",
        icon: UploadCloud,
      },
      {
        label: "Pending Replies",
        href: "/dashboard/replies",
        icon: MessageSquareReply,
      },
      {
        label: "Users & Logs",
        href: "/dashboard/users",
        icon: Users,
      },
    ],
  },
  {
    title: "ระบบ",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
      {
        label: "System Status",
        href: "/dashboard/status",
        icon: Activity,
      },
    ],
  },
];

function SidebarContent({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bayview-mark.png" alt="" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Bayview Dashboard</h1>
            <p className="text-[0.6875rem] text-zinc-500 dark:text-zinc-400">Admin Panel</p>
          </div>
        )}
      </div>

      <Separator className="bg-zinc-100 dark:bg-zinc-800/50" />

      {/* Navigation Groups */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
        {navSections.map((section, sectionIdx) => (
          <div key={section.title} className="space-y-1">
            {!collapsed ? (
              <div className="px-3 pt-1 pb-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {section.title}
                </p>
              </div>
            ) : (
              sectionIdx > 0 && <Separator className="my-2 bg-zinc-100 dark:bg-zinc-800/50" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                const linkContent = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shadow-sm shadow-blue-500/5"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                      }`}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger render={linkContent} />
                      <TooltipContent
                        side="right"
                        className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
                      >
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-zinc-100 dark:bg-zinc-800/50" />

      {/* Logout */}
      <div className={`p-3 ${collapsed ? "flex justify-center" : ""}`}>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className={`text-zinc-500 dark:text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ${
              collapsed ? "w-10 h-10 p-0" : "w-full justify-start gap-3"
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>ออกจากระบบ</span>}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col border-r border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 backdrop-blur-sm transition-all duration-300 ${
            collapsed ? "w-[68px]" : "w-64"
          }`}
        >
          <SidebarContent collapsed={collapsed} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/70 dark:bg-zinc-900/30 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile menu */}
              <Sheet>
                <SheetTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <SidebarContent />
                </SheetContent>
              </Sheet>

              {/* Collapse toggle - desktop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>

              {/* Refresh Button */}
              <RefreshButton />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              <CurrentAdmin />
              <ThemeToggle />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
