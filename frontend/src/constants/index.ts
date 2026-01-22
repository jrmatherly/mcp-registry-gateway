/**
 * Application constants for the MCP Registry Gateway frontend.
 */

// ============================================================================
// External Registry Tags
// ============================================================================

/**
 * Tags that identify servers/agents from external registries.
 * Used to separate internal and external registry items in the UI.
 */
export const EXTERNAL_REGISTRY_TAGS = [
  'anthropic-registry',
  'workday-asor',
  'asor',
  'federated',
] as const;

export type ExternalRegistryTag = (typeof EXTERNAL_REGISTRY_TAGS)[number];

/**
 * Check if a list of tags contains any external registry tag.
 */
export const hasExternalRegistryTag = (tags?: string[]): boolean => {
  if (!tags) return false;
  return EXTERNAL_REGISTRY_TAGS.some((tag) => tags.includes(tag));
};

// ============================================================================
// Semantic Search Constants
// ============================================================================

export const SEMANTIC_SEARCH_DEFAULTS = {
  MIN_LENGTH: 2,
  MAX_RESULTS: 10,
  DEBOUNCE_MS: 350,
} as const;

export const DEFAULT_ENTITY_TYPES = ['mcp_server', 'tool', 'a2a_agent'] as const;

export type SearchEntityType = (typeof DEFAULT_ENTITY_TYPES)[number];

// ============================================================================
// Toast Constants
// ============================================================================

export const TOAST_DURATION_MS = 4000;

// ============================================================================
// API Endpoints (relative paths)
// ============================================================================

export const API_ENDPOINTS = {
  // Auth
  AUTH_ME: '/api/auth/me',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_PROVIDERS: '/api/auth/providers',
  AUTH_CONFIG: '/api/auth/config',

  // Servers
  SERVERS: '/api/servers',
  SERVER_DETAILS: '/api/server_details',
  SERVER_TOGGLE: '/api/toggle',
  SERVER_EDIT: '/api/edit',
  SERVER_REGISTER: '/api/register',
  SERVER_TOOLS: '/api/tools',
  SERVER_REFRESH: '/api/refresh',
  SERVERS_V2: '/api/v2/servers',

  // Agents
  AGENTS: '/api/agents',

  // Search
  SEMANTIC_SEARCH: '/api/search/semantic',

  // Tokens
  TOKEN_GENERATE: '/api/tokens/generate',

  // Version
  VERSION: '/api/version',
} as const;

// ============================================================================
// Scope Descriptions
// ============================================================================

export const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'mcp-servers-restricted/read': 'Read access to restricted MCP servers',
  'mcp-servers/read': 'Read access to all MCP servers',
  'mcp-servers/write': 'Write access to MCP servers',
  'mcp-registry-user': 'Basic registry user permissions',
  'mcp-registry-admin': 'Full registry administration access',
  'health-check': 'Health check and monitoring access',
  'token-generation': 'Ability to generate access tokens',
  'server-management': 'Manage server configurations',
};

/**
 * Get description for a scope, or a default message if unknown.
 */
export const getScopeDescription = (scope: string): string => {
  return SCOPE_DESCRIPTIONS[scope] || 'Custom permission scope';
};

// ============================================================================
// Filter Options
// ============================================================================

export const FILTER_OPTIONS = [
  { key: 'all', label: 'All Services', countKey: 'total' },
  { key: 'enabled', label: 'Enabled', countKey: 'enabled' },
  { key: 'disabled', label: 'Disabled', countKey: 'disabled' },
  { key: 'unhealthy', label: 'With Issues', countKey: 'withIssues' },
] as const;

export type FilterKey = (typeof FILTER_OPTIONS)[number]['key'];

// ============================================================================
// View Filter Options
// ============================================================================

export const VIEW_FILTERS = ['all', 'servers', 'agents', 'external'] as const;

export type ViewFilter = (typeof VIEW_FILTERS)[number];

// ============================================================================
// Breakpoints
// ============================================================================

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// ============================================================================
// Local Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  REMEMBER_ME: 'rememberMe',
  SAVED_USERNAME: 'savedUsername',
  THEME: 'theme',
} as const;
