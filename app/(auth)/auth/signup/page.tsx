import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Sign up | Nebula CMS"
};

interface SignUpPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  const callbackParam = searchParams?.callbackUrl;
  const callbackUrl = Array.isArray(callbackParam) ? callbackParam[0] : callbackParam ?? "/admin";
  const showGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md">
        <Card className="border border-border/60 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold">Create an account</CardTitle>
            <CardDescription>Sign up with your email or continue with Google.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm callbackUrl={callbackUrl} showGoogle={showGoogle} />
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/signin" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
