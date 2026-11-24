"use client";

import type { DateGroupedConversations } from "@/hooks/useConversations";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  groups: DateGroupedConversations[];
  activeId?: string;
  isHydrated: boolean;
  hasSearchQuery: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onRequestDelete: (id: string, title: string) => void;
}

/**
 * Date-grouped conversation list with hydration-safe skeleton loader.
 */
export function ConversationList({
  groups,
  activeId,
  isHydrated,
  hasSearchQuery,
  onSelect,
  onRename,
  onRequestDelete,
}: ConversationListProps) {
  if (!isHydrated) {
    return (
      <div className="space-y-2 px-1 py-2" aria-label="Loading conversations">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-9 rounded-lg bg-background-secondary/70 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-xs text-foreground-muted/70">
          {hasSearchQuery
            ? "No conversations match your search."
            : "No saved conversations yet. Start a new chat above."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
            {group.label}
          </div>
          <div className="space-y-1">
            {group.items.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={onSelect}
                onRename={onRename}
                onRequestDelete={onRequestDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

