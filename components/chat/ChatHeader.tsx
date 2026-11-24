"use client";

import {
  Menu,
  PanelLeftOpen,
  RotateCcw,
  BookOpen,
  Database,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ChatHeaderProps {
  title: string;
  hasMessages: boolean;
  sidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
  onExpandDesktopSidebar: () => void;
  onClearConversation: () => void;
  onOpenKnowledgeDrawer: () => void;
}

/**
 * Top bar of the chat workspace with sidebar controls, active title,
 * Knowledge Mode status badge, Knowledge Explorer trigger, and Clear Chat action.
 */
export function ChatHeader({
  title,
  hasMessages,
  sidebarCollapsed,
  onOpenMobileSidebar,
  onExpandDesktopSidebar,
  onClearConversation,
  onOpenKnowledgeDrawer,
}: ChatHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-3 sm:px-5">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile sidebar open */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open conversation sidebar"
          className="lg:hidden p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop expand sidebar when collapsed */}
        {sidebarCollapsed && (
          <button
            type="button"
            onClick={onExpandDesktopSidebar}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="hidden lg:inline-flex p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <h1
          dir="auto"
          className="font-display text-sm sm:text-base font-semibold text-foreground truncate"
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="gold"
          className="hidden sm:inline-flex"
          title="Queries Terra Solutions Excel dataset locally. No external LLM key connected."
        >
          <Database className="h-3 w-3" />
          Knowledge Search Mode
        </Badge>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenKnowledgeDrawer}
          leftIcon={<BookOpen className="h-3.5 w-3.5 text-primary" />}
        >
          <span className="hidden sm:inline">Browse Knowledge</span>
          <span className="sm:hidden">KB</span>
        </Button>

        {hasMessages && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearConversation}
            title="Clear current conversation"
            aria-label="Clear current conversation"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            <span className="hidden md:inline">Clear</span>
          </Button>
        )}
      </div>
    </header>
  );
}

