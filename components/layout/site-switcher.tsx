"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

interface SiteSwitcherProps {
  sites: Array<{ id: string; name: string }>;
  activeSiteId?: string;
}

export const SiteSwitcher: React.FC<SiteSwitcherProps> = ({ sites, activeSiteId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) {
      params.set("siteId", value);
    } else {
      params.delete("siteId");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  if (!sites.length) {
    return null;
  }

  return (
    <select
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onChange={handleChange}
      value={activeSiteId ?? ""}
    >
      {sites.map((site) => (
        <option key={site.id} value={site.id}>
          {site.name}
        </option>
      ))}
    </select>
  );
};
