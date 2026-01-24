import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatISODate, formatTimeSince } from "../../../src/utils/dateUtils";

describe("dateUtils", () => {
  describe("formatTimeSince", () => {
    // Use fixed time for predictable tests
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-22T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns null for null input", () => {
      expect(formatTimeSince(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(formatTimeSince(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(formatTimeSince("")).toBeNull();
    });

    it("returns null for invalid date string", () => {
      expect(formatTimeSince("invalid-date")).toBeNull();
    });

    it("formats seconds ago correctly", () => {
      const timestamp = new Date("2025-01-22T11:59:30.000Z").toISOString();
      expect(formatTimeSince(timestamp)).toBe("30s ago");
    });

    it("formats minutes ago correctly", () => {
      const timestamp = new Date("2025-01-22T11:45:00.000Z").toISOString();
      expect(formatTimeSince(timestamp)).toBe("15m ago");
    });

    it("formats hours ago correctly", () => {
      const timestamp = new Date("2025-01-22T09:00:00.000Z").toISOString();
      expect(formatTimeSince(timestamp)).toBe("3h ago");
    });

    it("formats days ago correctly", () => {
      const timestamp = new Date("2025-01-20T12:00:00.000Z").toISOString();
      expect(formatTimeSince(timestamp)).toBe("2d ago");
    });

    it("handles exactly 0 seconds difference", () => {
      const timestamp = new Date("2025-01-22T12:00:00.000Z").toISOString();
      expect(formatTimeSince(timestamp)).toBe("0s ago");
    });

    it("handles future dates gracefully", () => {
      const futureTimestamp = new Date(
        "2025-01-23T12:00:00.000Z",
      ).toISOString();
      // Implementation returns negative-looking value or handles it
      const result = formatTimeSince(futureTimestamp);
      expect(result).not.toBeNull();
    });

    it("handles edge case at boundary (59 seconds)", () => {
      const timestamp = new Date("2025-01-22T11:59:01.000Z").toISOString();
      expect(formatTimeSince(timestamp)).toBe("59s ago");
    });

    it("handles edge case at boundary (59 minutes)", () => {
      const timestamp = new Date("2025-01-22T11:01:00.000Z").toISOString();
      expect(formatTimeSince(timestamp)).toBe("59m ago");
    });

    it("handles edge case at boundary (23 hours)", () => {
      const timestamp = new Date("2025-01-21T13:00:00.000Z").toISOString();
      expect(formatTimeSince(timestamp)).toBe("23h ago");
    });
  });

  describe("formatISODate", () => {
    it("formats Date object to ISO date string", () => {
      const date = new Date("2025-01-22T15:30:00.000Z");
      expect(formatISODate(date)).toBe("2025-01-22");
    });

    it("formats timestamp number to ISO date string", () => {
      const timestamp = new Date("2025-06-15T00:00:00.000Z").getTime();
      expect(formatISODate(timestamp)).toBe("2025-06-15");
    });

    it("handles beginning of year", () => {
      const date = new Date("2025-01-01T00:00:00.000Z");
      expect(formatISODate(date)).toBe("2025-01-01");
    });

    it("handles end of year", () => {
      const date = new Date("2025-12-31T23:59:59.999Z");
      expect(formatISODate(date)).toBe("2025-12-31");
    });
  });
});
