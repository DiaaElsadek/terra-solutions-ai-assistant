"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import { clsx } from "clsx";
import type { ConversationSummary } from "@/types";

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onRequestDelete: (id: string, title: string) => void;
}

/**
 * Single conversation row in the sidebar with inline rename and delete triggers.
 */
export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onRequestDelete,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraftTitle(conversation.title);
    setIsEditing(true);
  };

  const commitRename = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(conversation.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-sidebar-active border border-primary/50 px-2 py-1.5">
        <input
          ref={inputRef}
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          aria-label="Rename conversation"
          className="flex-1 min-w-0 bg-transparent text-xs text-foreground focus:outline-none"
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            commitRename();
          }}
          aria-label="Save title"
          className="p-1 text-emerald-400 hover:text-emerald-300"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsEditing(false);
          }}
          aria-label="Cancel rename"
          className="p-1 text-foreground-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "group relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors",
        isActive
          ? "bg-sidebar-active text-foreground border border-primary/30"
          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground border border-transparent"
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className="flex flex-1 items-center gap-2 min-w-0 text-start focus-visible:outline-none"
      >
        <MessageSquare
          className={clsx(
            "h-3.5 w-3.5 shrink-0",
            isActive ? "text-primary" : "text-foreground-muted/60"
          )}
        />
        <span dir="auto" className="truncate font-medium">
          {conversation.title}
        </span>
      </button>

      <div
        className={clsx(
          "flex items-center gap-0.5 shrink-0 transition-opacity",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
        )}
      >
        <button
          type="button"
          onClick={startEditing}
          aria-label={`Rename ${conversation.title}`}
          title="Rename"
          className="p-1 rounded hover:bg-background-tertiary text-foreground-muted hover:text-primary transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(conversation.id, conversation.title)}
          aria-label={`Delete ${conversation.title}`}
          title="Delete"
          className="p-1 rounded hover:bg-background-tertiary text-foreground-muted hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
