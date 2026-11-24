import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create an agent account for Terra AI Assistant.",
};

export default function SignUpPage() {
  return (
    <section className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12 sm:px-6">
      <SignUpForm />
    </section>
  );
}

