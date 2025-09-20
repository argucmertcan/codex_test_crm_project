"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Chrome, Loader2, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { CredentialsSignUpInput } from "@/lib/validations/auth";
import { credentialsSignUpSchema } from "@/lib/validations/auth";

interface SignUpFormProps {
  callbackUrl: string;
  showGoogle: boolean;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ callbackUrl, showGoogle }) => {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isGoogleLoading, setGoogleLoading] = React.useState(false);

  const form = useForm<CredentialsSignUpInput>({
    resolver: zodResolver(credentialsSignUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(values)
      });

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl
      });

      if (result?.error) {
        setError("Account created, but automatic sign-in failed. Please sign in manually.");
        return;
      }

      router.push(result?.url ?? callbackUrl ?? "/admin");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        console.error(err);
        setError("Unable to create an account. Please try again.");
      }
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Jane Doe" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                  <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
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
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Create account
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
            Continue with Google
          </Button>
        ) : null}
      </form>
    </Form>
  );
};
