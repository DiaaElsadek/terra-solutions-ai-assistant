"use client";

import { useState, useRef, type RefObject } from "react";
import {
  Plus,
  Search,
  X,
  LogOut,
  Trash2,
  PanelLeftClose,
  Home,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import type { AuthUser } from "@/types";
import type { DateGroupedConversations } from "@/hooks/useConversations";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { ConversationList } from "./ConversationList";
import { ROUTES } from "@/constants/config";

interface SidebarProps {
  user: AuthUser | null;
  groupedSummaries: DateGroupedConversations[];
  activeId?: string;
  isHydrated: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  isCollapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAllHistory: () => void;
  onSignOut: () => void;
}

/**
 * Collapsible left sidebar with conversation search, history list, and user profile.
 */
export function Sidebar({
  user,
  groupedSummaries,
  activeId,
  isHydrated,
  searchQuery,
  onSearchChange,
  searchInputRef,
  isCollapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearAllHistory,
  onSignOut,
}: SidebarProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const localSearchRef = useRef<HTMLInputElement>(null);
  const effectiveSearchRef = searchInputRef || localSearchRef;

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    onCloseMobile();
  };

  const handleNewChat = () => {
    onNewChat();
    onCloseMobile();
  };

  const sidebarContent = (
    <aside
      aria-label="Conversation history sidebar"
      className="flex h-full w-72 flex-col border-r border-border bg-sidebar"
    >
      {/* Top brand & collapse */}
      <div className="flex h-14 items-center justify-between gap-2 px-3.5 border-b border-border/80 shrink-0">
        <BrandLogo href={ROUTES.home} subtitle="Solutions Assistant" size="sm" priority />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="hidden lg:inline-flex p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New Chat & Search */}
      <div className="p-3 space-y-2.5 shrink-0 border-b border-border/60">
        <Button
          variant="primary"
          size="md"
          onClick={handleNewChat}
          leftIcon={<Plus className="h-4 w-4" />}
          className="w-full justify-start"
        >
          New Chat
        </Button>

        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-foreground-muted/60" />
          <input
            ref={effectiveSearchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats… (/)"
            aria-label="Search conversations"
            className="w-full h-9 rounded-lg bg-background-secondary border border-border pl-8 pr-7 text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 p-0.5 text-foreground-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2.5">
        <ConversationList
          groups={groupedSummaries}
          activeId={activeId}
          isHydrated={isHydrated}
          hasSearchQuery={Boolean(searchQuery.trim())}
          onSelect={handleSelect}
          onRename={onRenameConversation}
          onRequestDelete={(id, title) => setDeleteTarget({ id, title })}
        />
      </div>

      {/* Footer / User Profile */}
      <div className="border-t border-border p-3 space-y-2.5 shrink-0 bg-background-secondary/50">
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.fullName || "Agent"} variant="user" size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">
              {user?.fullName || "Call Center Agent"}
            </p>
            <p className="text-[11px] text-foreground-muted/75 truncate">
              {user?.email || "Local Session"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 pt-1">
          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
            title="Home"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>

          <button
            type="button"
            onClick={() => setClearAllOpen(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-red-400 hover:bg-background-tertiary transition-colors"
            title="Clear all saved conversations"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-primary hover:bg-background-tertiary transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <p className="text-[10px] text-foreground-muted/55 text-center">
          Terra Solutions · Internal Support Workspace
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={clsx(
          "hidden lg:block h-full shrink-0 transition-all duration-200 overflow-hidden",
          isCollapsed ? "w-0" : "w-72"
        )}
      >
        {!isCollapsed && sidebarContent}
      </div>

      {/* Mobile / Tablet slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Delete single conversation confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Conversation"
        description="This action permanently removes this chat and its messages from this browser."
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Delete{" "}
            <strong className="text-foreground">
              &ldquo;{deleteTarget?.title}&rdquo;
            </strong>
            ?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteTarget) {
                  onDeleteConversation(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear all history confirmation */}
      <Modal
        isOpen={clearAllOpen}
        onClose={() => setClearAllOpen(false)}
        title="Clear All Local History"
        description="Removes all conversations and messages stored in this browser."
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Are you sure you want to delete all saved chats? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setClearAllOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onClearAllHistory();
                setClearAllOpen(false);
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

