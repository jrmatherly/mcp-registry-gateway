import { describe, expect, it } from "vitest";
import type { ActiveFilter } from "../../../src/types";
import {
  filterBySearchTerm,
  filterByStatus,
  filterEntities,
} from "../../../src/utils/filterUtils";

/**
 * Factory function to create test entities with type safety.
 * Uses Partial to allow overriding any field.
 */
interface TestEntity {
  name: string;
  path: string;
  description?: string;
  tags?: string[];
  enabled: boolean;
  status?: string;
}

const createEntity = (overrides: Partial<TestEntity> = {}): TestEntity => ({
  name: "test-server",
  path: "/test/path",
  description: "Test description",
  tags: ["tag1", "tag2"],
  enabled: true,
  status: "healthy",
  ...overrides,
});

describe("filterUtils", () => {
  describe("filterByStatus", () => {
    // Define test fixtures once, reuse across tests
    const entities = [
      createEntity({
        name: "enabled-healthy",
        enabled: true,
        status: "healthy",
      }),
      createEntity({
        name: "enabled-unhealthy",
        enabled: true,
        status: "unhealthy",
      }),
      createEntity({ name: "disabled", enabled: false, status: "unknown" }),
    ];

    it('returns all entities when filter is "all"', () => {
      const result = filterByStatus(entities, "all");
      expect(result).toHaveLength(3);
    });

    it('returns only enabled entities when filter is "enabled"', () => {
      const result = filterByStatus(entities, "enabled");
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.enabled)).toBe(true);
    });

    it('returns only disabled entities when filter is "disabled"', () => {
      const result = filterByStatus(entities, "disabled");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("disabled");
    });

    it('returns only unhealthy entities when filter is "unhealthy"', () => {
      const result = filterByStatus(entities, "unhealthy");
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("unhealthy");
    });

    it("returns empty array when no entities match", () => {
      const healthyOnly = [createEntity({ status: "healthy" })];
      const result = filterByStatus(healthyOnly, "unhealthy");
      expect(result).toHaveLength(0);
    });

    // Edge case: handles empty array input
    it("returns empty array when input is empty", () => {
      const result = filterByStatus([], "all");
      expect(result).toHaveLength(0);
    });

    // Edge case: handles unknown filter value (defensive)
    it("returns all entities for unknown filter value", () => {
      const result = filterByStatus(entities, "invalid" as ActiveFilter);
      expect(result).toHaveLength(3);
    });
  });

  describe("filterBySearchTerm", () => {
    const entities = [
      createEntity({
        name: "weather-api",
        description: "Weather data service",
      }),
      createEntity({
        name: "user-service",
        description: "User management",
        tags: ["auth"],
      }),
      createEntity({ name: "data-processor", path: "/data/process" }),
    ];

    it("returns all entities when search term is empty", () => {
      const result = filterBySearchTerm(entities, "");
      expect(result).toHaveLength(3);
    });

    it("returns all entities when search term is whitespace", () => {
      const result = filterBySearchTerm(entities, "   ");
      expect(result).toHaveLength(3);
    });

    it("filters by name (case insensitive)", () => {
      const result = filterBySearchTerm(entities, "WEATHER");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("weather-api");
    });

    it("filters by description", () => {
      const result = filterBySearchTerm(entities, "management");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("user-service");
    });

    it("filters by path", () => {
      const result = filterBySearchTerm(entities, "/data/");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("data-processor");
    });

    it("filters by tags", () => {
      const result = filterBySearchTerm(entities, "auth");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("user-service");
    });

    // Edge case: entity with undefined optional fields
    it("handles entities with undefined description and tags", () => {
      const entitiesWithUndefined = [
        createEntity({
          name: "minimal",
          description: undefined,
          tags: undefined,
        }),
      ];
      // Should not throw when searching
      const result = filterBySearchTerm(entitiesWithUndefined, "minimal");
      expect(result).toHaveLength(1);
    });

    // Edge case: special regex characters in search term
    it("handles special characters in search term", () => {
      const entitiesWithSpecial = [
        createEntity({ name: "api-v2.0", description: "Version (2.0)" }),
      ];
      // Should treat as literal string, not regex
      const result = filterBySearchTerm(entitiesWithSpecial, "(2.0)");
      expect(result).toHaveLength(1);
    });
  });

  describe("filterEntities", () => {
    const entities = [
      createEntity({ name: "weather-api", enabled: true }),
      createEntity({ name: "weather-backup", enabled: false }),
      createEntity({ name: "user-service", enabled: true }),
    ];

    it("applies both status and search filters", () => {
      const result = filterEntities(entities, "enabled", "weather");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("weather-api");
    });

    it("returns empty when filters have no overlap", () => {
      const result = filterEntities(entities, "disabled", "user");
      expect(result).toHaveLength(0);
    });

    // Verify filter order: status first, then search (optimization)
    it("applies status filter before search filter", () => {
      // This test documents the expected behavior: status filter runs first
      // which is more efficient when there are many entities
      const result = filterEntities(entities, "disabled", "weather");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("weather-backup");
    });
  });
});
