import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Terra Solutions AI Knowledge Assistant.",
};

export default function SignInPage() {
  return (
    <section className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12 sm:px-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" className="text-primary" />
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </section>
  );
}

