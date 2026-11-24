"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Conversation, ConversationSummary, UserPreferences } from "@/types";
import * as convStore from "@/lib/storage/conversations";
import * as storage from "@/lib/storage/local-storage";
import { STORAGE_KEYS } from "@/constants/config";

export interface DateGroupedConversations {
  label: string;
  items: ConversationSummary[];
}

const noopSubscribe = () => () => {};

/** Group conversation summaries by relative date buckets. */
export function groupConversationsByDate(
  items: ConversationSummary[]
): DateGroupedConversations[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - oneDay;
  const startOfLast7Days = startOfToday - 7 * oneDay;

  const groups: Record<string, ConversationSummary[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  for (const item of items) {
    const ts = new Date(item.updatedAt).getTime();
    if (ts >= startOfToday) {
      groups.Today.push(item);
    } else if (ts >= startOfYesterday) {
      groups.Yesterday.push(item);
    } else if (ts >= startOfLast7Days) {
      groups["Previous 7 Days"].push(item);
    } else {
      groups.Older.push(item);
    }
  }

  return Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

/**
 * Manages persisted conversation summaries, active conversation selection,
 * search filtering, rename, delete, and UI sidebar preferences.
 */
export function useConversations() {
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const [summariesState, setSummariesState] = useState<
    ConversationSummary[] | null
  >(null);
  const [activeConvState, setActiveConvState] = useState<
    Conversation | null | undefined
  >(undefined);
  const [sidebarPrefState, setSidebarPrefState] = useState<boolean | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Read initial summaries/active conversation once mounted without sync setState in effect
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const all = convStore.listConversations();
      setSummariesState(all);

      const prefs = storage.getItem<UserPreferences>(STORAGE_KEYS.preferences, {
        sidebarCollapsed: false,
      });
      setSidebarPrefState(prefs.sidebarCollapsed);

      const activeId = convStore.getActiveConversationId();
      if (activeId) {
        const conv = convStore.getConversation(activeId);
        if (conv) {
          setActiveConvState(conv);
          return;
        }
      }
      if (all.length > 0) {
        const first = convStore.getConversation(all[0].id);
        if (first) {
          convStore.setActiveConversationId(first.id);
          setActiveConvState(first);
          return;
        }
      }
      setActiveConvState(null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const summaries = useMemo(
    () => (isHydrated && summariesState !== null ? summariesState : []),
    [isHydrated, summariesState]
  );

  const activeConversation =
    isHydrated && activeConvState !== undefined ? activeConvState : null;
  const sidebarCollapsed =
    isHydrated && sidebarPrefState !== null ? sidebarPrefState : false;

  const setActiveConversation = useCallback((conv: Conversation | null) => {
    setActiveConvState(conv);
  }, []);

  const refreshSummaries = useCallback(() => {
    setSummariesState(convStore.listConversations());
  }, []);

  const toggleSidebarCollapsed = useCallback(
    (next?: boolean) => {
      const value = typeof next === "boolean" ? next : !sidebarCollapsed;
      setSidebarPrefState(value);
      const existing = storage.getItem<UserPreferences>(
        STORAGE_KEYS.preferences,
        { sidebarCollapsed: false }
      );
      storage.setItem(STORAGE_KEYS.preferences, {
        ...existing,
        sidebarCollapsed: value,
      });
    },
    [sidebarCollapsed]
  );

  const selectConversation = useCallback((id: string) => {
    const conv = convStore.getConversation(id);
    if (conv) {
      convStore.setActiveConversationId(id);
      setActiveConvState(conv);
    }
  }, []);

  const createNewChat = useCallback((): Conversation => {
    const conv = convStore.createConversation("New Conversation");
    setActiveConvState(conv);
    setSummariesState(convStore.listConversations());
    return conv;
  }, []);

  const renameChat = useCallback(
    (id: string, newTitle: string) => {
      convStore.renameConversation(id, newTitle);
      setSummariesState(convStore.listConversations());
      if (activeConversation?.id === id) {
        const updated = convStore.getConversation(id);
        if (updated) setActiveConvState(updated);
      }
    },
    [activeConversation?.id]
  );

  const deleteChat = useCallback(
    (id: string) => {
      convStore.deleteConversation(id);
      const remaining = convStore.listConversations();
      setSummariesState(remaining);

      if (activeConversation?.id === id) {
        if (remaining.length > 0) {
          const next = convStore.getConversation(remaining[0].id);
          if (next) {
            convStore.setActiveConversationId(next.id);
            setActiveConvState(next);
          } else {
            setActiveConvState(null);
          }
        } else {
          setActiveConvState(null);
        }
      }
    },
    [activeConversation?.id]
  );

  const clearAllHistory = useCallback(() => {
    convStore.deleteAllConversations();
    setSummariesState([]);
    setActiveConvState(null);
  }, []);

  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const q = searchQuery.toLowerCase();
    return summaries.filter((s) => s.title.toLowerCase().includes(q));
  }, [summaries, searchQuery]);

  const groupedSummaries = useMemo(
    () => groupConversationsByDate(filteredSummaries),
    [filteredSummaries]
  );

  return {
    summaries,
    filteredSummaries,
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
  };
}
