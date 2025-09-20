import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteSwitcher } from "@/components/layout/site-switcher";
import { siteRepository } from "@/server/db/repositories/site.repository";
import { auth } from "@/server/auth";

import { ContentTypeManager } from "./content-type-manager";

export const metadata: Metadata = {
  title: "Content Types"
};

interface ContentTypesPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function ContentTypesPage({ searchParams }: ContentTypesPageProps) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required");
  }
  if (!session.user.capabilities?.includes("manageContentTypes")) {
    throw new Error("You do not have permission to manage content types");
  }

  const selectedSiteParam = searchParams?.siteId;
  const selectedSiteId = Array.isArray(selectedSiteParam) ? selectedSiteParam[0] : selectedSiteParam;

  const sitesResult = await siteRepository.list({
    limit: 20,
    teamId: session.user.teamId ?? null
  });

  const sites = sitesResult.items;
  const activeSite = sites.find((site) => site.id === selectedSiteId) ?? sites[0];

  if (!activeSite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No sites available</CardTitle>
          <CardDescription>Create a site to begin defining content models.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Types</h1>
          <p className="text-sm text-muted-foreground">
            Define structured content models and manage the fields editors will use.
          </p>
        </div>
        <SiteSwitcher
          sites={sites.map((site) => ({ id: site.id, name: site.name }))}
          activeSiteId={activeSite.id}
        />
      </div>
      <ContentTypeManager site={activeSite} />
    </div>
  );
}
