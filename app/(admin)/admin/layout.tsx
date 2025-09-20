import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { FileText, LayoutDashboard, Layers3 } from "lucide-react";

import { AppProvider } from "@/components/providers/app-provider";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/server/auth";

const navigation = [
  { title: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: "Content Types", href: "/admin/content/types", icon: <Layers3 className="h-4 w-4" /> },
  { title: "Entries", href: "/admin/content/entries", icon: <FileText className="h-4 w-4" /> }
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <AppProvider>
      <div className="flex min-h-screen w-full bg-background">
        <aside className="hidden w-64 border-r bg-card/40 lg:block">
          <div className="flex h-16 items-center px-6 text-lg font-semibold">Nebula CMS</div>
          <SidebarNav items={navigation} />
        </aside>
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Signed in as</span>
              <span className="font-medium text-foreground">{session.user.name ?? session.user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col lg:flex-row">
            <div className="block border-b bg-card/40 px-6 py-4 lg:hidden">
              <SidebarNav items={navigation} />
            </div>
            <main className="flex-1 space-y-6 bg-muted/40 p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
