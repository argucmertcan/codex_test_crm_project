import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Nebula CMS</h1>
        <p className="text-muted-foreground">
          A modular headless CMS platform for teams building modern digital experiences.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/auth/signin">Sign in to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
