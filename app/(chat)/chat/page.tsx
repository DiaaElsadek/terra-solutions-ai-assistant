import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "AI Knowledge Workspace",
  description: "Call center AI knowledge workspace for Terra Solutions.",
};

export default function ChatPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-background">
            <Spinner size="lg" className="text-primary" />
          </div>
        }
      >
        <ChatWorkspace />
      </Suspense>
    </AuthGuard>
  );
}

