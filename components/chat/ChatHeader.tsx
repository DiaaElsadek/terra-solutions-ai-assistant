"use client";

import {
  Menu,
  PanelLeftOpen,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { TerraMark } from "@/components/branding/TerraMark";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/constants/brand";

interface ChatHeaderProps {
  title: string;
  hasMessages: boolean;
  sidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
  onExpandDesktopSidebar: () => void;
  onNewChat: () => void;
  onClearConversation: () => void;
  onOpenKnowledgeDrawer: () => void;
}

/**
 * Streamlined workspace header presenting Terra Assistant identity,
 * quick conversation reset/creation controls, and direct Knowledge Catalog access.
 */
export function ChatHeader({
  title,
  hasMessages,
  sidebarCollapsed,
  onOpenMobileSidebar,
  onExpandDesktopSidebar,
  onNewChat,
  onClearConversation,
  onOpenKnowledgeDrawer,
}: ChatHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/85 bg-background/95 backdrop-blur-xs px-3 sm:px-6">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open conversation sidebar"
          className="lg:hidden p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {sidebarCollapsed && (
          <button
            type="button"
            onClick={onExpandDesktopSidebar}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="hidden lg:inline-flex p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <div className="flex items-center gap-2.5 min-w-0">
          <TerraMark size="xs" variant="badge" className="lg:hidden" />

          <div className="min-w-0">
            <h1
              dir="auto"
              className="font-display text-sm sm:text-[15px] font-semibold text-foreground truncate"
            >
              {title}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span
          title="Answers are grounded strictly in verified Terra Solutions company records."
          className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background-secondary/85 px-2.5 py-1 text-[11px] font-medium text-foreground-muted"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>{BRAND.assistant.shortName} · Verified Catalog</span>
        </span>

        {hasMessages && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            aria-label="Start new conversation"
            title="New Chat (Ctrl+N)"
            leftIcon={<Plus className="h-3.5 w-3.5 text-primary" />}
            className="lg:hidden"
          >
            <span className="hidden sm:inline">New</span>
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenKnowledgeDrawer}
          leftIcon={<BookOpen className="h-3.5 w-3.5 text-primary" />}
        >
          <span className="hidden sm:inline">Knowledge Catalog</span>
          <span className="sm:hidden">Catalog</span>
        </Button>

        {hasMessages && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearConversation}
            aria-label="Clear conversation messages"
            title="Clear conversation"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            <span className="hidden sm:inline">Clear</span>
          </Button>
        )}
      </div>
    </header>
  );
}
