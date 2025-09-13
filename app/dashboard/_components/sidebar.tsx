"use client";

import UserProfile from "@/components/user-profile";
import clsx from "clsx";
import {
  Banknote,
  HomeIcon,
  LucideIcon,
  MessageCircleIcon,
  Settings,
  Upload,
  ChevronLeft,
  ChevronRight,
  Library,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: HomeIcon },
  { label: "Books", href: "/dashboard/Books", icon: MessageCircleIcon },
  { label: "Upload", href: "/dashboard/upload", icon: Upload },
  { label: "Payment Gated", href: "/dashboard/payment", icon: Banknote },
];

export default function DashboardSideBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div
      className={clsx(
        "min-[1024px]:block hidden border-r h-full bg-card/50 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-[3.45rem] items-center justify-between border-b px-2">
          <Link
            prefetch={true}
            className={clsx(
              "flex items-center font-semibold hover:cursor-pointer",
              collapsed ? "justify-center w-full" : "gap-2"
            )}
            href="/"
          >
            <Library className="h-5 w-5 shrink-0" />
            {!collapsed && <span>BooksHall</span>}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col h-full justify-between items-start w-full space-y-1">
          <div className="w-full space-y-1 p-2">
            {navItems.map((item) => (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                  pathname === item.href
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 w-full pb-2">
            <div className="px-2">
              <div
                onClick={() => router.push("/dashboard/settings")}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                  pathname === "/dashboard/settings"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </div>
            </div>

            <div
              className={clsx(
                "flex justify-center",
                !collapsed && "px-2 justify-start"
              )}
            >
              {/* UserProfile kendi içinde avatar içeriyor */}
              <UserProfile mini={collapsed} />
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
