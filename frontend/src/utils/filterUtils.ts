/**
 * Reusable filter utilities for servers and agents.
 */

import type { ActiveFilter } from "../types";

/**
 * Base interface for filterable entities (servers and agents).
 */
interface FilterableEntity {
  name: string;
  path: string;
  description?: string;
  tags?: string[];
  enabled: boolean;
  status?: string;
}

/**
 * Filters entities by status (enabled/disabled/unhealthy).
 *
 * @param entities - Array of entities to filter
 * @param activeFilter - The active filter type
 * @returns Filtered array of entities
 */
export const filterByStatus = <T extends FilterableEntity>(
  entities: T[],
  activeFilter: ActiveFilter,
): T[] => {
  switch (activeFilter) {
    case "enabled":
      return entities.filter((e) => e.enabled);
    case "disabled":
      return entities.filter((e) => !e.enabled);
    case "unhealthy":
      return entities.filter((e) => e.status === "unhealthy");
    default:
      return entities;
  }
};

/**
 * Filters entities by search term (name, description, path, tags).
 *
 * @param entities - Array of entities to filter
 * @param searchTerm - The search term to filter by
 * @returns Filtered array of entities
 */
export const filterBySearchTerm = <T extends FilterableEntity>(
  entities: T[],
  searchTerm: string,
): T[] => {
  if (!searchTerm.trim()) {
    return entities;
  }

  const query = searchTerm.toLowerCase();
  return entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(query) ||
      (entity.description || "").toLowerCase().includes(query) ||
      entity.path.toLowerCase().includes(query) ||
      (entity.tags || []).some((tag) => tag.toLowerCase().includes(query)),
  );
};

/**
 * Combined filter function that applies both status and search filters.
 *
 * @param entities - Array of entities to filter
 * @param activeFilter - The active status filter
 * @param searchTerm - The search term to filter by
 * @returns Filtered array of entities
 */
export const filterEntities = <T extends FilterableEntity>(
  entities: T[],
  activeFilter: ActiveFilter,
  searchTerm: string,
): T[] => {
  const statusFiltered = filterByStatus(entities, activeFilter);
  return filterBySearchTerm(statusFiltered, searchTerm);
};
