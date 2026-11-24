"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { TerraAnimatedLoader } from "./TerraAnimatedLoader";

const INTRO_STORAGE_KEY = "terra_v1_intro_shown";

type IntroState = "uninitialized" | "playing" | "completed";

let clientIntroState: IntroState = "uninitialized";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): "playing" | "completed" {
  return "completed";
}

function getClientSnapshot(): "playing" | "completed" {
  if (clientIntroState !== "uninitialized") {
    return clientIntroState;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const forceIntro = params.get("intro") === "1";
    const hasCloak = document.documentElement.dataset.terraIntro === "pending";
    const alreadyShown = window.sessionStorage.getItem(INTRO_STORAGE_KEY) === "1";

    if (forceIntro || hasCloak || !alreadyShown) {
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
      clientIntroState = "playing";
      return "playing";
    }
  } catch {
    // Storage/URL failure fails open directly to the application UI
  }

  clientIntroState = "completed";
  return "completed";
}

function completeIntro(): void {
  if (clientIntroState === "completed") return;
  clientIntroState = "completed";
  try {
    delete document.documentElement.dataset.terraIntro;
  } catch {
    // ignore
  }
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Session-aware entrance controller mounted at root layout.
 * Plays the Terra Solutions signature reveal once per browser session on first load,
 * avoids interrupting internal route transitions or same-tab refreshes, and gracefully
 * relinquishes focus to the ready application underneath.
 */
export function AppEntranceLoader() {
  const introState = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  // Hand off pre-hydration obsidian cloak cleanly once React overlay paints
  useEffect(() => {
    try {
      delete document.documentElement.dataset.terraIntro;
    } catch {
      // ignore
    }
  }, [introState]);

  const handleComplete = useCallback(() => {
    completeIntro();
  }, []);

  if (introState !== "playing") {
    return null;
  }

  return <TerraAnimatedLoader onComplete={handleComplete} />;
}

