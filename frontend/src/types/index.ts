/**
 * Centralized type definitions for the MCP Registry Gateway frontend.
 */

// ============================================================================
// Health Status Types
// ============================================================================

export type HealthStatus =
  | "healthy"
  | "healthy-auth-expired"
  | "unhealthy"
  | "unknown";

export type TrustLevel = "community" | "verified" | "trusted" | "unverified";

export type Visibility = "public" | "private" | "group-restricted";

export type EntityType = "server" | "agent";

// ============================================================================
// Rating Types
// ============================================================================

export interface RatingDetail {
  user: string;
  rating: number;
}

// ============================================================================
// Server Types
// ============================================================================

export interface ServerBase {
  name: string;
  path: string;
  description?: string;
  enabled: boolean;
  tags?: string[];
  last_checked_time?: string;
  status?: HealthStatus;
}

export interface Server extends ServerBase {
  official?: boolean;
  usersCount?: number;
  rating?: number;
  num_stars?: number;
  rating_details?: RatingDetail[];
  num_tools?: number;
  proxy_pass_url?: string;
  license?: string;
  is_python?: boolean;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface Agent extends ServerBase {
  url?: string;
  version?: string;
  visibility?: Visibility;
  trust_level?: TrustLevel;
  usersCount?: number;
  rating?: number;
  rating_details?: RatingDetail[];
  provider?: string;
}

// Extended Agent type for full API responses with additional metadata
export interface AgentDetails extends Agent {
  [key: string]: unknown;
}

// ============================================================================
// Combined Entity Type (for hooks that handle both)
// ============================================================================

export interface ServiceEntity extends ServerBase {
  type: EntityType;
  official?: boolean;
  usersCount?: number;
  rating?: number;
  num_tools?: number;
  // Agent-specific fields
  url?: string;
  version?: string;
  visibility?: Visibility;
  trust_level?: TrustLevel;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ServerStats {
  total: number;
  enabled: number;
  disabled: number;
  withIssues: number;
}

// ============================================================================
// Security Scan Types
// ============================================================================

export interface SecurityScanResult {
  server_path?: string;
  server_url?: string;
  agent_path?: string;
  agent_url?: string;
  scan_timestamp: string;
  is_safe: boolean;
  critical_issues: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  analyzers_used: string[];
  raw_output: {
    analysis_results?: Record<string, unknown>;
    tool_results?: Record<string, unknown>;
    scan_results?: Record<string, unknown>;
  };
  scan_failed: boolean;
  error_message?: string;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface Tool {
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
}

// ============================================================================
// Semantic Search Types
// ============================================================================

export interface MatchingToolHit {
  tool_name: string;
  description?: string;
  relevance_score: number;
  match_context?: string;
}

export interface SemanticServerHit {
  path: string;
  server_name: string;
  description?: string;
  tags: string[];
  num_tools: number;
  is_enabled: boolean;
  relevance_score: number;
  match_context?: string;
  matching_tools: MatchingToolHit[];
}

export interface SemanticToolHit {
  server_path: string;
  server_name: string;
  tool_name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  relevance_score: number;
  match_context?: string;
}

export interface SemanticAgentHit {
  path: string;
  agent_name: string;
  description?: string;
  tags: string[];
  skills: string[];
  trust_level?: string;
  visibility?: string;
  is_enabled?: boolean;
  url?: string;
  agent_card?: Record<string, unknown>;
  relevance_score: number;
  match_context?: string;
}

export interface SemanticSearchResponse {
  query: string;
  servers: SemanticServerHit[];
  tools: SemanticToolHit[];
  agents: SemanticAgentHit[];
  total_servers: number;
  total_tools: number;
  total_agents: number;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface UIPermissions {
  list_service?: string[];
  health_check_service?: string[];
  toggle_service?: string[];
  list_agents?: string[];
  health_check_agent?: string[];
  toggle_agent?: string[];
  [key: string]: string[] | undefined;
}

export interface User {
  username: string;
  email?: string;
  scopes?: string[];
  groups?: string[];
  auth_method?: string;
  provider?: string;
  can_modify_servers?: boolean;
  is_admin?: boolean;
  ui_permissions?: UIPermissions;
}

// ============================================================================
// Toast Types
// ============================================================================

export type ToastType = "success" | "error";

export interface ToastData {
  message: string;
  type: ToastType;
}

// ============================================================================
// Common Callback Types
// ============================================================================

export type ShowToastCallback = (message: string, type: ToastType) => void;

// ============================================================================
// API Response Types (Backend -> Frontend mapping)
// ============================================================================

/**
 * Server data as returned from the /api/servers endpoint.
 */
export interface ServerApiResponse {
  display_name: string;
  path: string;
  description?: string;
  is_official?: boolean;
  is_enabled?: boolean;
  tags?: string[];
  last_checked_iso?: string;
  num_stars?: number;
  health_status?: string;
  num_tools?: number;
  proxy_pass_url?: string;
  license?: string;
  is_python?: boolean;
}

/**
 * Agent data as returned from the /api/agents endpoint.
 */
export interface AgentApiResponse {
  name: string;
  path: string;
  description?: string;
  is_enabled?: boolean;
  tags?: string[];
  num_stars?: number;
  num_skills?: number;
  url?: string;
  version?: string;
  visibility?: string;
  trust_level?: string;
}

/**
 * Wrapper for /api/servers response.
 */
export interface ServersListResponse {
  servers: ServerApiResponse[];
}

/**
 * Wrapper for /api/agents response.
 */
export interface AgentsListResponse {
  agents: AgentApiResponse[];
}

/**
 * User data as returned from /api/auth/me endpoint.
 */
export interface UserApiResponse {
  username: string;
  email?: string;
  scopes?: string[];
  groups?: string[];
  auth_method?: string;
  provider?: string;
  can_modify_servers?: boolean;
  is_admin?: boolean;
  ui_permissions?: UIPermissions;
}

// ============================================================================
// View Filter Types
// ============================================================================

export type ViewFilter = "all" | "servers" | "agents" | "external";

export type ActiveFilter = "all" | "enabled" | "disabled" | "unhealthy";

// ============================================================================
// Form Types
// ============================================================================

export interface EditServerForm {
  name: string;
  path: string;
  proxyPass: string;
  description: string;
  tags: string[];
  license: string;
  num_tools: number;
  num_stars: number;
  is_python: boolean;
}

export interface EditAgentForm {
  name: string;
  path: string;
  description: string;
  version: string;
  visibility: Visibility;
  trust_level: TrustLevel;
  tags: string[];
}

export interface RegisterServerForm {
  name: string;
  path: string;
  proxyPass: string;
  description: string;
  official: boolean;
  tags: string[];
}
