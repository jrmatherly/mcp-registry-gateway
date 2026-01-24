import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToastProps } from "../../src/components/Toast";
import Toast from "../../src/components/Toast";
import { TOAST_DURATION_MS } from "../../src/constants";
import { render, screen } from "../../src/test/test-utils";

describe("Toast", () => {
  // Use typed default props for better test maintainability
  const defaultProps: ToastProps = {
    message: "Test message",
    type: "success",
    onClose: vi.fn(),
  };

  // Helper to create props with overrides
  const createProps = (overrides: Partial<ToastProps> = {}): ToastProps => ({
    ...defaultProps,
    onClose: vi.fn(), // Fresh mock for each test
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders success toast with correct styling", () => {
      render(<Toast {...createProps({ type: "success" })} />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText("Test message")).toBeInTheDocument();
      expect(alert).toHaveClass("bg-green-50");
    });

    it("renders error toast with correct styling", () => {
      render(<Toast {...createProps({ type: "error" })} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-red-50");
    });

    it("renders message text correctly", () => {
      const longMessage =
        "This is a longer error message with details about what went wrong";
      render(<Toast {...createProps({ message: longMessage })} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("renders close button with accessible label", () => {
      render(<Toast {...createProps()} />);

      const closeButton = screen.getByRole("button", {
        name: /close notification/i,
      });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute("aria-label");
    });

    it("renders success icon for success type", () => {
      render(<Toast {...createProps({ type: "success" })} />);

      const alert = screen.getByRole("alert");
      const icon = alert.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("renders error icon for error type", () => {
      render(<Toast {...createProps({ type: "error" })} />);

      const alert = screen.getByRole("alert");
      const icon = alert.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onClose when close button is clicked", async () => {
      // Use real timers for this test since userEvent doesn't play well with fake timers
      vi.useRealTimers();
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<Toast {...createProps({ onClose })} />);

      await user.click(
        screen.getByRole("button", { name: /close notification/i }),
      );

      expect(onClose).toHaveBeenCalledTimes(1);
      // Restore fake timers for subsequent tests
      vi.useFakeTimers();
    });
  });

  describe("auto-dismiss", () => {
    it("auto-dismisses after default duration", () => {
      const onClose = vi.fn();
      render(<Toast {...createProps({ onClose })} />);

      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(TOAST_DURATION_MS);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("auto-dismisses after custom duration", () => {
      const onClose = vi.fn();
      const customDuration = 2000;
      render(<Toast {...createProps({ onClose, duration: customDuration })} />);

      vi.advanceTimersByTime(customDuration - 1);
      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("clears timeout on unmount to prevent memory leak", () => {
      const onClose = vi.fn();
      const { unmount } = render(<Toast {...createProps({ onClose })} />);

      // Unmount before timer fires
      unmount();

      // Advance past the duration
      vi.advanceTimersByTime(TOAST_DURATION_MS + 1000);

      // onClose should not be called after unmount
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it('has role="alert" for screen readers', () => {
      render(<Toast {...createProps()} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it('has aria-live="polite" for non-urgent notifications', () => {
      render(<Toast {...createProps()} />);

      expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
    });

    it("close button has descriptive aria-label", () => {
      render(<Toast {...createProps()} />);

      const closeButton = screen.getByRole("button");
      expect(closeButton).toHaveAttribute("aria-label", "Close notification");
    });

    it("icons are hidden from screen readers", () => {
      render(<Toast {...createProps()} />);

      const alert = screen.getByRole("alert");
      const icon = alert.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("dark mode classes", () => {
    it("has dark mode classes for success variant", () => {
      render(<Toast {...createProps({ type: "success" })} />);

      const alert = screen.getByRole("alert");
      // Check that dark mode classes are present
      expect(alert.className).toContain("dark:bg-green-900");
    });

    it("has dark mode classes for error variant", () => {
      render(<Toast {...createProps({ type: "error" })} />);

      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("dark:bg-red-900");
    });
  });
});
