"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { useConversations } from "@/hooks/useConversations";
import { useChat } from "@/hooks/useChat";
import { Sidebar } from "./Sidebar";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { KnowledgeDrawer } from "@/components/knowledge/KnowledgeDrawer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/config";

/**
 * Full AI Chat Workspace orchestrating sidebar history, conversation CRUD,
 * knowledge retrieval, and persistence.
 */
export function ChatWorkspace() {
  const { user, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    groupedSummaries,
    activeConversation,
    setActiveConversation,
    searchQuery,
    setSearchQuery,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    isHydrated,
    selectConversation,
    createNewChat,
    renameChat,
    deleteChat,
    clearAllHistory,
    refreshSummaries,
  } = useConversations();

  const {
    isGenerating,
    storageWarning,
    sendMessage,
    retryLastResponse,
    clearCurrentConversation,
  } = useChat({
    activeConversation,
    setActiveConversation,
    createNewChat,
    refreshSummaries,
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const consumedQueryRef = useRef<string | null>(null);

  // Handle ?q= query parameter from landing page category cards
  useEffect(() => {
    if (!isHydrated) return;
    const q = searchParams.get("q");
    if (q && consumedQueryRef.current !== q) {
      consumedQueryRef.current = q;
      const conv = createNewChat();
      router.replace(ROUTES.chat, { scroll: false });
      void sendMessage(`Tell me about ${q}`, conv);
    }
  }, [isHydrated, searchParams, createNewChat, router, sendMessage]);

  // Global keyboard shortcuts: / to focus search, Ctrl+N for new chat, Escape closes drawers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileSidebarOpen(false);
        setKnowledgeOpen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNewChat();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        if (sidebarCollapsed) toggleSidebarCollapsed(false);
        setMobileSidebarOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createNewChat, sidebarCollapsed, toggleSidebarCollapsed]);

  const messages = activeConversation?.messages || [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        user={user}
        groupedSummaries={groupedSummaries}
        activeId={activeConversation?.id}
        isHydrated={isHydrated}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        isCollapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => toggleSidebarCollapsed()}
        onNewChat={() => {
          createNewChat();
        }}
        onSelectConversation={selectConversation}
        onRenameConversation={renameChat}
        onDeleteConversation={deleteChat}
        onClearAllHistory={clearAllHistory}
        onSignOut={() => void signOut()}
      />

      <main className="flex flex-1 flex-col min-w-0 h-full">
        <ChatHeader
          title={activeConversation?.title || "New Conversation"}
          hasMessages={messages.length > 0}
          sidebarCollapsed={sidebarCollapsed}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onExpandDesktopSidebar={() => toggleSidebarCollapsed(false)}
          onClearConversation={() => setClearModalOpen(true)}
          onOpenKnowledgeDrawer={() => setKnowledgeOpen(true)}
        />

        {storageWarning && (
          <div
            role="alert"
            className="flex items-center gap-2 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{storageWarning}</span>
          </div>
        )}

        <ChatMessages
          messages={messages}
          isGenerating={isGenerating}
          userName={user?.fullName}
          onSelectPrompt={(text) => void sendMessage(text)}
          onRetry={() => void retryLastResponse()}
        />

        <ChatInput
          onSend={(text) => void sendMessage(text)}
          isGenerating={isGenerating}
        />
      </main>

      <KnowledgeDrawer
        isOpen={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        onAskQuestion={(q) => void sendMessage(q)}
      />

      <Modal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Clear Conversation Messages"
        description="Removes all messages in the current chat while keeping the conversation tab."
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Clear all messages in{" "}
            <strong className="text-foreground">
              &ldquo;{activeConversation?.title || "this conversation"}&rdquo;
            </strong>
            ?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setClearModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearCurrentConversation();
                setClearModalOpen(false);
              }}
            >
              Clear Messages
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
