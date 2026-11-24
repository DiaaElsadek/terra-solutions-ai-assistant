import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEYS, conversationKey } from "@/constants/config";
import * as storage from "@/lib/storage/local-storage";
import {
  listConversations,
  getConversation,
  createConversation,
  addMessage,
  renameConversation,
  deleteConversation,
  clearConversationMessages,
  searchConversations,
} from "@/lib/storage/conversations";
import { localAuthAdapter } from "@/lib/auth/local-adapter";

interface MemoryStorage extends Storage {
  setSimulateQuotaExceeded(flag: boolean): void;
}

function createMockLocalStorage(): MemoryStorage {
  const store = new Map<string, string>();
  let simulateQuota = false;

  return {
    setSimulateQuotaExceeded(flag: boolean) {
      simulateQuota = flag;
    },
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      if (simulateQuota && key !== "__terra_storage_test__") {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      store.set(key, String(value));
    },
  };
}

describe("Browser Persistence & Demo Authentication Adapter", () => {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const originalWindow = (globalThis as { window?: unknown }).window;
  let mockStorage: MemoryStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: mockStorage },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (hadWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it("handles corrupted JSON recovery and QuotaExceededError safely", () => {
    mockStorage.setItem("terra_v1_corrupt", "{invalid-json");
    const recovered = storage.getItem("terra_v1_corrupt", { ok: true });
    assert.deepEqual(recovered, { ok: true });
    assert.equal(mockStorage.getItem("terra_v1_corrupt"), null);

    mockStorage.setSimulateQuotaExceeded(true);
    const saved = storage.setItem("terra_v1_large", { big: "data" });
    assert.equal(saved, false);
  });

  it("supports conversation CRUD, search, message clearing, and deletion", () => {
    const conv = createConversation("Botox Consultation");
    assert.equal(listConversations().length, 1);

    const added = addMessage(conv.id, {
      id: "msg-1",
      role: "user",
      content: "Is Botox safe during pregnancy?",
      timestamp: new Date().toISOString(),
      status: "sent",
    });
    assert.equal(added, true);

    const loaded = getConversation(conv.id);
    assert.equal(loaded?.messages.length, 1);

    renameConversation(conv.id, "Botox Pregnancy Inquiry");
    assert.equal(searchConversations("Pregnancy").length, 1);

    clearConversationMessages(conv.id);
    assert.equal(getConversation(conv.id)?.messages.length, 0);

    deleteConversation(conv.id);
    assert.equal(listConversations().length, 0);
    assert.equal(mockStorage.getItem(conversationKey(conv.id)), null);
  });

  it("supports demo signUp, duplicate check, signIn, signOut, and hashes passwords", async () => {
    const signUpOk = await localAuthAdapter.signUp({
      fullName: "Nour Agent",
      email: "nour@terra.local",
      password: "Password123!",
    });
    assert.equal(signUpOk.success, true);
    assert.equal(localAuthAdapter.isAuthenticated(), true);

    const storedRaw = mockStorage.getItem("terra_v1_auth_users") || "";
    assert.equal(storedRaw.includes("Password123!"), false);

    const duplicate = await localAuthAdapter.signUp({
      fullName: "Nour Clone",
      email: "nour@terra.local",
      password: "Password123!",
    });
    assert.equal(duplicate.success, false);

    await localAuthAdapter.signOut();
    assert.equal(localAuthAdapter.isAuthenticated(), false);

    const badLogin = await localAuthAdapter.signIn({
      email: "nour@terra.local",
      password: "WrongPassword",
    });
    assert.equal(badLogin.success, false);

    const goodLogin = await localAuthAdapter.signIn({
      email: "nour@terra.local",
      password: "Password123!",
    });
    assert.equal(goodLogin.success, true);
    assert.ok(mockStorage.getItem(STORAGE_KEYS.authSession));
  });
});

