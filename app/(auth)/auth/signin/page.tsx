import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";

import { SignInForm } from "./sign-in-form";

const errorMessages: Record<string, string> = {
  CredentialsSignin: "Invalid email or password. Please try again.",
  AccessDenied: "Your account does not have access.",
  OAuthAccountNotLinked: "Sign in with the provider originally used for this account."
};

export const metadata: Metadata = {
  title: "Sign in | Nebula CMS"
};

interface SignInPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackParam = searchParams?.callbackUrl;
  const callbackUrl = Array.isArray(callbackParam) ? callbackParam[0] : callbackParam ?? "/admin";
  const errorParam = searchParams?.error;
  const errorKey = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const errorMessage = errorKey ? errorMessages[errorKey] ?? "Unable to sign in." : null;

  const showGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md">
        <Card className="border border-border/60 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
            <CardDescription>Sign in with your credentials or continue with Google.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignInForm callbackUrl={callbackUrl} showGoogle={showGoogle} initialError={errorMessage} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
