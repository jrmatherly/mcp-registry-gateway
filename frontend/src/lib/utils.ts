/**
 * Aceternity UI Utility Functions
 *
 * Core utilities for class name management and Tailwind CSS integration.
 * Following Aceternity UI installation guide: https://ui.aceternity.com/docs/add-utilities
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes intelligently, resolving conflicts between utility classes.
 *
 * This function combines clsx for conditional class handling with tailwind-merge
 * to properly handle Tailwind CSS class conflicts (e.g., `bg-red-500 bg-blue-500`
 * resolves to `bg-blue-500`).
 *
 * @param inputs - Class values to merge (strings, objects, arrays, etc.)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * ```tsx
 * // Basic usage
 * cn("px-4 py-2", "bg-blue-500")
 * // => "px-4 py-2 bg-blue-500"
 *
 * // Conflict resolution
 * cn("bg-red-500", "bg-blue-500")
 * // => "bg-blue-500"
 *
 * // Conditional classes
 * cn("base-class", isActive && "active-class", { "error-class": hasError })
 * // => "base-class active-class error-class" (depending on conditions)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
