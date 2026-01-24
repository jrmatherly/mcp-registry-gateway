import { describe, expect, it } from "vitest";
import {
  API_ENDPOINTS,
  EXTERNAL_REGISTRY_TAGS,
  getScopeDescription,
  hasExternalRegistryTag,
  SEMANTIC_SEARCH_DEFAULTS,
} from "../../../src/constants";

describe("constants", () => {
  describe("EXTERNAL_REGISTRY_TAGS", () => {
    it("contains expected external registry identifiers", () => {
      expect(EXTERNAL_REGISTRY_TAGS).toContain("anthropic-registry");
      expect(EXTERNAL_REGISTRY_TAGS).toContain("workday-asor");
      expect(EXTERNAL_REGISTRY_TAGS).toContain("federated");
    });

    it("is a readonly array", () => {
      // TypeScript enforces this at compile time, but we can verify runtime behavior
      expect(Array.isArray(EXTERNAL_REGISTRY_TAGS)).toBe(true);
      expect(EXTERNAL_REGISTRY_TAGS.length).toBeGreaterThan(0);
    });
  });

  describe("hasExternalRegistryTag", () => {
    it("returns true when tags contain external registry tag", () => {
      expect(hasExternalRegistryTag(["local", "anthropic-registry"])).toBe(
        true,
      );
      expect(hasExternalRegistryTag(["federated"])).toBe(true);
      expect(hasExternalRegistryTag(["workday-asor", "other"])).toBe(true);
    });

    it("returns false when tags do not contain external registry tag", () => {
      expect(hasExternalRegistryTag(["local", "internal"])).toBe(false);
    });

    it("returns false for undefined tags", () => {
      expect(hasExternalRegistryTag(undefined)).toBe(false);
    });

    it("returns false for empty tags array", () => {
      expect(hasExternalRegistryTag([])).toBe(false);
    });

    it("is case sensitive", () => {
      expect(hasExternalRegistryTag(["ANTHROPIC-REGISTRY"])).toBe(false);
      expect(hasExternalRegistryTag(["Federated"])).toBe(false);
    });
  });

  describe("SEMANTIC_SEARCH_DEFAULTS", () => {
    it("has expected default values", () => {
      expect(SEMANTIC_SEARCH_DEFAULTS.MIN_LENGTH).toBe(2);
      expect(SEMANTIC_SEARCH_DEFAULTS.MAX_RESULTS).toBe(10);
      expect(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS).toBe(350);
    });

    it("has sensible values", () => {
      expect(SEMANTIC_SEARCH_DEFAULTS.MIN_LENGTH).toBeGreaterThan(0);
      expect(SEMANTIC_SEARCH_DEFAULTS.MAX_RESULTS).toBeGreaterThan(0);
      expect(SEMANTIC_SEARCH_DEFAULTS.DEBOUNCE_MS).toBeGreaterThan(100); // reasonable debounce
    });
  });

  describe("getScopeDescription", () => {
    it("returns description for known scopes", () => {
      expect(getScopeDescription("mcp-servers/read")).toBe(
        "Read access to all MCP servers",
      );
      expect(getScopeDescription("mcp-registry-admin")).toBe(
        "Full registry administration access",
      );
      expect(getScopeDescription("mcp-servers/write")).toBe(
        "Write access to MCP servers",
      );
    });

    it("returns default message for unknown scopes", () => {
      expect(getScopeDescription("unknown-scope")).toBe(
        "Custom permission scope",
      );
      expect(getScopeDescription("")).toBe("Custom permission scope");
      expect(getScopeDescription("random-string-123")).toBe(
        "Custom permission scope",
      );
    });
  });

  describe("API_ENDPOINTS", () => {
    it("has all required auth endpoints", () => {
      expect(API_ENDPOINTS.AUTH_ME).toBe("/api/auth/me");
      expect(API_ENDPOINTS.AUTH_LOGIN).toBe("/api/auth/login");
      expect(API_ENDPOINTS.AUTH_LOGOUT).toBe("/api/auth/logout");
      expect(API_ENDPOINTS.AUTH_PROVIDERS).toBe("/api/auth/providers");
    });

    it("has server endpoints", () => {
      expect(API_ENDPOINTS.SERVERS).toBe("/api/servers");
      expect(API_ENDPOINTS.SEMANTIC_SEARCH).toBe("/api/search/semantic");
      expect(API_ENDPOINTS.SERVER_DETAILS).toBe("/api/server_details");
    });

    it("has agent endpoints", () => {
      expect(API_ENDPOINTS.AGENTS).toBe("/api/agents");
    });

    it("all endpoints start with /api/", () => {
      Object.values(API_ENDPOINTS).forEach((endpoint) => {
        expect(endpoint).toMatch(/^\/api\//);
      });
    });
  });
});
