import axios from 'axios';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../constants';
import type {
  AgentApiResponse,
  AgentsListResponse,
  HealthStatus,
  ServerApiResponse,
  ServerStats,
  ServersListResponse,
} from '../types';
import { getErrorMessage } from '../utils/errorHandler';

/**
 * Internal server representation used by the hook.
 * Extends the base Server type with a discriminator for entity type.
 */
interface ServerEntity {
  name: string;
  path: string;
  description?: string;
  official?: boolean;
  enabled: boolean;
  tags?: string[];
  last_checked_time?: string;
  usersCount?: number;
  rating?: number;
  status?: HealthStatus;
  num_tools?: number;
  type: 'server' | 'agent';
}

interface UseServerStatsReturn {
  stats: ServerStats;
  servers: ServerEntity[];
  agents: ServerEntity[];
  setServers: Dispatch<SetStateAction<ServerEntity[]>>;
  setAgents: Dispatch<SetStateAction<ServerEntity[]>>;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

/**
 * Maps backend health status string to frontend HealthStatus type.
 */
const mapHealthStatus = (healthStatus: string | undefined): HealthStatus => {
  if (!healthStatus || healthStatus === 'unknown') return 'unknown';
  if (healthStatus === 'healthy') return 'healthy';
  if (healthStatus === 'healthy-auth-expired') return 'healthy-auth-expired';
  if (
    healthStatus.includes('unhealthy') ||
    healthStatus.includes('error') ||
    healthStatus.includes('timeout')
  ) {
    return 'unhealthy';
  }
  return 'unknown';
};

/**
 * Transforms server API response to frontend entity format.
 */
const transformServerResponse = (serverInfo: ServerApiResponse): ServerEntity => ({
  name: serverInfo.display_name || 'Unknown Server',
  path: serverInfo.path,
  description: serverInfo.description || '',
  official: serverInfo.is_official || false,
  enabled: serverInfo.is_enabled ?? false,
  tags: serverInfo.tags || [],
  last_checked_time: serverInfo.last_checked_iso,
  usersCount: 0,
  rating: serverInfo.num_stars || 0,
  status: mapHealthStatus(serverInfo.health_status),
  num_tools: serverInfo.num_tools || 0,
  type: 'server',
});

/**
 * Transforms agent API response to frontend entity format.
 */
const transformAgentResponse = (agentInfo: AgentApiResponse): ServerEntity => ({
  name: agentInfo.name || 'Unknown Agent',
  path: agentInfo.path,
  description: agentInfo.description || '',
  official: false,
  enabled: agentInfo.is_enabled ?? false,
  tags: agentInfo.tags || [],
  last_checked_time: undefined,
  usersCount: 0,
  rating: agentInfo.num_stars || 0,
  status: 'unknown',
  num_tools: agentInfo.num_skills || 0,
  type: 'agent',
});

/**
 * Calculates stats from a combined list of servers and agents.
 */
const calculateStats = (services: ServerEntity[]): ServerStats => {
  return services.reduce(
    (acc, service) => ({
      total: acc.total + 1,
      enabled: acc.enabled + (service.enabled ? 1 : 0),
      disabled: acc.disabled + (service.enabled ? 0 : 1),
      withIssues: acc.withIssues + (service.status === 'unhealthy' ? 1 : 0),
    }),
    { total: 0, enabled: 0, disabled: 0, withIssues: 0 }
  );
};

/**
 * Hook for fetching and managing server and agent statistics.
 */
export const useServerStats = (): UseServerStatsReturn => {
  const [stats, setStats] = useState<ServerStats>({
    total: 0,
    enabled: 0,
    disabled: 0,
    withIssues: 0,
  });
  const [servers, setServers] = useState<ServerEntity[]>([]);
  const [agents, setAgents] = useState<ServerEntity[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both servers and agents in parallel
      const [serversResponse, agentsResponse] = await Promise.all([
        axios.get<ServersListResponse>(API_ENDPOINTS.SERVERS),
        axios
          .get<AgentsListResponse>(API_ENDPOINTS.AGENTS)
          .catch(() => ({ data: { agents: [] } as AgentsListResponse })),
      ]);

      const serversList = serversResponse.data?.servers || [];
      const agentsList = agentsResponse.data?.agents || [];

      // Transform API responses to frontend format
      const transformedServers = serversList.map(transformServerResponse);
      const transformedAgents = agentsList.map(transformAgentResponse);

      // Update state
      setServers(transformedServers);
      setAgents(transformedAgents);

      // Calculate and set stats
      const allServices = [...transformedServers, ...transformedAgents];
      setStats(calculateStats(allServices));
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Failed to fetch data');
      setError(errorMessage);
      setServers([]);
      setAgents([]);
      setStats({ total: 0, enabled: 0, disabled: 0, withIssues: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    servers,
    agents,
    setServers,
    setAgents,
    activeFilter,
    setActiveFilter,
    loading,
    error,
    refreshData: fetchData,
  };
};
