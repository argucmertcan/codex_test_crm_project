"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Chrome, Loader2, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { CredentialsSignInInput } from "@/lib/validations/auth";
import { credentialsSignInSchema } from "@/lib/validations/auth";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password. Please try again.",
  AccessDenied: "Your account does not have access.",
  default: "Unable to sign in. Please try again."
};

interface SignInFormProps {
  callbackUrl: string;
  showGoogle: boolean;
  initialError?: string | null;
}

export const SignInForm: React.FC<SignInFormProps> = ({ callbackUrl, showGoogle, initialError }) => {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [isGoogleLoading, setGoogleLoading] = React.useState(false);

  const form = useForm<CredentialsSignInInput>({
    resolver: zodResolver(credentialsSignInSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await signIn("credentials", {
        ...values,
        redirect: false,
        callbackUrl
      });

      if (result?.error) {
        setError(AUTH_ERROR_MESSAGES[result.error] ?? AUTH_ERROR_MESSAGES.default);
        return;
      }

      router.push(result?.url ?? callbackUrl ?? "/admin");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(AUTH_ERROR_MESSAGES.default);
    }
  });

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error(err);
      setError("Google sign-in is currently unavailable.");
      setGoogleLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Sign in
        </Button>

        {showGoogle ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Sign in with Google
          </Button>
        ) : null}
      </form>
    </Form>
  );
};
