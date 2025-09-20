import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteSwitcher } from "@/components/layout/site-switcher";
import { entryRepository } from "@/server/db/repositories/entry.repository";
import { siteRepository } from "@/server/db/repositories/site.repository";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Admin Dashboard"
};

interface DashboardPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function AdminDashboard({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required");
  }
  if (!session.user.capabilities?.includes("viewContent")) {
    throw new Error("You do not have permission to view content");
  }
  const selectedSiteParam = searchParams?.siteId;
  const selectedSiteId = Array.isArray(selectedSiteParam) ? selectedSiteParam[0] : selectedSiteParam;

  const sitesResult = await siteRepository.list({
    limit: 20,
    teamId: session.user.teamId ?? null
  });

  const sites = sitesResult.items;
  const activeSite = sites.find((site) => site.id === selectedSiteId) ?? sites[0];

  let entryStats = { draft: 0, published: 0, scheduled: 0 };
  let recentEntries: Awaited<ReturnType<typeof entryRepository.list>> | null = null;
  let scheduledEntries: Awaited<ReturnType<typeof entryRepository.list>> | null = null;

  if (activeSite) {
    entryStats = await entryRepository.countByStatus(activeSite.id);
    recentEntries = await entryRepository.list({ siteId: activeSite.id, limit: 5 });
    scheduledEntries = await entryRepository.list({ siteId: activeSite.id, statuses: ["scheduled"], limit: 5 });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor content activity and publication health.</p>
        </div>
        <SiteSwitcher
          sites={sites.map((site) => ({ id: site.id, name: site.name }))}
          activeSiteId={activeSite?.id}
        />
      </div>
      {!activeSite ? (
        <Card>
          <CardHeader>
            <CardTitle>No sites configured</CardTitle>
            <CardDescription>Create a site to start managing content.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Draft entries</CardTitle>
              <CardDescription>Work in progress content awaiting review.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{entryStats.draft}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Published entries</CardTitle>
              <CardDescription>Live entries across your channels.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{entryStats.published}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Scheduled entries</CardTitle>
              <CardDescription>Upcoming publications for {activeSite.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{entryStats.scheduled}</p>
            </CardContent>
          </Card>
        </div>
      )}
      {activeSite ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent updates</CardTitle>
              <CardDescription>Latest changes made to your content.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEntries && recentEntries.items.length ? (
                  recentEntries.items.map((entry) => (
                    <div key={entry.id} className="space-y-1 rounded-md border border-border/60 bg-card/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{entry.title}</div>
                        <Badge variant={entry.status === "published" ? "success" : entry.status === "scheduled" ? "warning" : "secondary"}>
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(entry.updatedAt).toLocaleString()} · Locale {entry.locale}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent entries.</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Scheduled entries</CardTitle>
              <CardDescription>Upcoming publications awaiting automatic release.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledEntries && scheduledEntries.items.length ? (
                  scheduledEntries.items.map((entry) => (
                    <div key={entry.id} className="space-y-1 rounded-md border border-border/60 bg-card/60 p-3">
                      <div className="text-sm font-medium">{entry.title}</div>
                      <p className="text-xs text-muted-foreground">
                        {entry.publishAt
                          ? `Scheduled for ${new Date(entry.publishAt).toLocaleString()}`
                          : "Awaiting publish date"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No scheduled entries.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
