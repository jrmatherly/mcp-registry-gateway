import {
  IconCheck,
  IconClock,
  IconCpu,
  IconInfoCircle,
  IconLock,
  IconPencil,
  IconRefresh,
  IconShield,
  IconShieldExclamation,
  IconWorld,
} from "@tabler/icons-react";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import type {
  HealthStatus,
  RatingDetail,
  SecurityScanResult,
  ShowToastCallback,
  TrustLevel,
  Visibility,
} from "../types";
import { formatTimeSince } from "../utils/dateUtils";
import { handleApiError } from "../utils/errorHandler";
import AgentDetailsModal from "./AgentDetailsModal";
import SecurityScanModal from "./SecurityScanModal";
import StarRatingWidget from "./StarRatingWidget";
import { HealthBadge, getHealthStatus } from "@/components/ui";

/**
 * Agent interface representing an A2A agent.
 */
export interface Agent {
  name: string;
  path: string;
  url?: string;
  description?: string;
  version?: string;
  visibility?: Visibility;
  trust_level?: TrustLevel;
  enabled: boolean;
  tags?: string[];
  last_checked_time?: string;
  usersCount?: number;
  rating?: number;
  rating_details?: RatingDetail[];
  status?: HealthStatus;
  provider?: string;
}

/**
 * Props for the AgentCard component.
 */
interface AgentCardProps {
  agent: Agent;
  onToggle: (path: string, enabled: boolean) => void;
  onEdit?: (agent: Agent) => void;
  canModify?: boolean;
  canHealthCheck?: boolean; // Whether user can run health check on this agent
  canToggle?: boolean; // Whether user can enable/disable this agent
  onRefreshSuccess?: () => void;
  onShowToast?: ShowToastCallback;
  onAgentUpdate?: (path: string, updates: Partial<Agent>) => void;
  authToken?: string | null;
}

const normalizeHealthStatus = (status?: string | null): HealthStatus => {
  if (status === "healthy" || status === "healthy-auth-expired") {
    return status;
  }
  if (status === "unhealthy") {
    return "unhealthy";
  }
  return "unknown";
};

/**
 * AgentCard component for displaying A2A agents.
 *
 * Displays agent information with a distinct visual style from MCP servers,
 * using blue/cyan tones and robot-themed icons.
 */
const AgentCard: React.FC<AgentCardProps> = React.memo(
  ({
    agent,
    onToggle,
    onEdit,
    canModify,
    canHealthCheck = true,
    canToggle = true,
    onRefreshSuccess,
    onShowToast,
    onAgentUpdate,
    authToken,
  }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [loadingRefresh, setLoadingRefresh] = useState(false);
    const [fullAgentDetails, setFullAgentDetails] = useState<Record<string, unknown> | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showSecurityScan, setShowSecurityScan] = useState(false);
    const [securityScanResult, setSecurityScanResult] = useState<SecurityScanResult | null>(null);
    const [loadingSecurityScan, setLoadingSecurityScan] = useState(false);
    const [isRatingDropdownOpen, setIsRatingDropdownOpen] = useState(false);

    // Fetch security scan status on mount to show correct icon color
    useEffect(() => {
      const fetchSecurityScan = async () => {
        try {
          const headers = authToken
            ? { Authorization: `Bearer ${authToken}` }
            : undefined;
          const response = await axios.get(
            `/api/agents${agent.path}/security-scan`,
            headers ? { headers } : undefined,
          );
          setSecurityScanResult(response.data);
        } catch {
          // Silently ignore - no scan result available
        }
      };
      fetchSecurityScan();
    }, [agent.path, authToken]);

    const getTrustLevelColor = () => {
      switch (agent.trust_level) {
        case "trusted":
          return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700";
        case "verified":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600";
      }
    };

    const getTrustLevelIcon = () => {
      switch (agent.trust_level) {
        case "trusted":
          return <IconShield className="h-3 w-3" />;
        case "verified":
          return <IconCheck className="h-3 w-3" />;
        default:
          return null;
      }
    };

    const getVisibilityIcon = () => {
      return agent.visibility === "public" ? (
        <IconWorld className="h-3 w-3" />
      ) : (
        <IconLock className="h-3 w-3" />
      );
    };

    const handleRefreshHealth = useCallback(async () => {
      if (loadingRefresh) return;

      setLoadingRefresh(true);
      try {
        const headers = authToken
          ? { Authorization: `Bearer ${authToken}` }
          : undefined;
        const response = await axios.post(
          `/api/agents${agent.path}/health`,
          undefined,
          headers ? { headers } : undefined,
        );

        // Update just this agent instead of triggering global refresh
        if (onAgentUpdate && response.data) {
          const updates: Partial<Agent> = {
            status: normalizeHealthStatus(response.data.status),
            last_checked_time: response.data.last_checked_iso,
          };

          onAgentUpdate(agent.path, updates);
        } else if (onRefreshSuccess) {
          // Fallback to global refresh if onAgentUpdate is not provided
          onRefreshSuccess();
        }

        if (onShowToast) {
          onShowToast("Agent health status refreshed successfully", "success");
        }
      } catch (error: unknown) {
        handleApiError(error, "refresh agent health", onShowToast);
      } finally {
        setLoadingRefresh(false);
      }
    }, [
      agent.path,
      authToken,
      loadingRefresh,
      onRefreshSuccess,
      onShowToast,
      onAgentUpdate,
    ]);

    const handleCopyDetails = useCallback(
      async (data: unknown) => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          onShowToast?.("Full agent JSON copied to clipboard!", "success");
        } catch (error: unknown) {
          handleApiError(error, "copy JSON", onShowToast);
        }
      },
      [onShowToast],
    );

    const handleViewSecurityScan = useCallback(async () => {
      if (loadingSecurityScan) return;

      setShowSecurityScan(true);
      setLoadingSecurityScan(true);
      try {
        const headers = authToken
          ? { Authorization: `Bearer ${authToken}` }
          : undefined;
        const response = await axios.get(
          `/api/agents${agent.path}/security-scan`,
          headers ? { headers } : undefined,
        );
        setSecurityScanResult(response.data);
      } catch (error: unknown) {
        handleApiError(error, "load security scan results", onShowToast, {
          silentOn404: true,
        });
        setSecurityScanResult(null);
      } finally {
        setLoadingSecurityScan(false);
      }
    }, [agent.path, authToken, loadingSecurityScan, onShowToast]);

    const handleRescan = useCallback(async () => {
      const headers = authToken
        ? { Authorization: `Bearer ${authToken}` }
        : undefined;
      const response = await axios.post(
        `/api/agents${agent.path}/rescan`,
        undefined,
        headers ? { headers } : undefined,
      );
      setSecurityScanResult(response.data);
    }, [agent.path, authToken]);

    const getSecurityIconState = () => {
      // Gray: no scan result yet
      if (!securityScanResult) {
        return {
          Icon: IconShield,
          color: "text-gray-400 dark:text-gray-500",
          title: "View security scan results",
        };
      }
      // Red: scan failed or any vulnerabilities found
      if (securityScanResult.scan_failed) {
        return {
          Icon: IconShieldExclamation,
          color: "text-red-500 dark:text-red-400",
          title: "Security scan failed",
        };
      }
      const hasVulnerabilities =
        (securityScanResult.critical_issues ?? 0) > 0 ||
        (securityScanResult.high_severity ?? 0) > 0 ||
        (securityScanResult.medium_severity ?? 0) > 0 ||
        (securityScanResult.low_severity ?? 0) > 0;
      if (hasVulnerabilities) {
        return {
          Icon: IconShieldExclamation,
          color: "text-red-500 dark:text-red-400",
          title: "Security issues found",
        };
      }
      // Green: scan passed with no vulnerabilities
      return {
        Icon: IconShield,
        color: "text-green-500 dark:text-green-400",
        title: "Security scan passed",
      };
    };

    return (
      <>
        <div className={`group rounded-2xl h-full flex flex-col transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 bg-linear-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-900/30 dark:to-blue-900/30 border-2 border-cyan-300/50 dark:border-cyan-600/50 hover:border-cyan-400/70 dark:hover:border-cyan-500/70 shadow-lg shadow-cyan-500/10 hover:shadow-xl hover:shadow-cyan-500/20 backdrop-blur-xl overflow-visible ${isRatingDropdownOpen ? "z-50" : ""}`}>
          {/* Header */}
          <div className="p-5 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {agent.name}
                  </h3>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full shrink-0 bg-linear-to-r from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 shadow-sm">
                    AGENT
                  </span>
                  {/* Check if this is an ASOR agent */}
                  {(agent.tags?.includes("asor") ||
                    agent.provider === "ASOR") && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-linear-to-r from-orange-100 to-red-100 text-orange-700 dark:from-orange-900/30 dark:to-red-900/30 dark:text-orange-300 rounded-full shrink-0 border border-orange-200 dark:border-orange-600">
                      ASOR
                    </span>
                  )}
                  {agent.trust_level && (
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 flex items-center gap-1 ${getTrustLevelColor()}`}
                    >
                      {getTrustLevelIcon()}
                      {agent.trust_level.toUpperCase()}
                    </span>
                  )}
                  {agent.visibility && (
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 flex items-center gap-1 ${
                        agent.visibility === "public"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      {getVisibilityIcon()}
                      {agent.visibility.toUpperCase()}
                    </span>
                  )}
                </div>

                <code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-sm font-mono">
                  {agent.path}
                </code>
                {agent.version && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    v{agent.version}
                  </span>
                )}
                {agent.url && (
                  <a
                    href={agent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-700 dark:text-cyan-300 break-all hover:underline"
                  >
                    <span className="font-mono">{agent.url}</span>
                  </a>
                )}
              </div>

              {canModify && (
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 shrink-0"
                  onClick={() => onEdit?.(agent)}
                  title="Edit agent"
                >
                  <IconPencil className="h-4 w-4" />
                </button>
              )}

              {/* Security Scan Button */}
              <button
                type="button"
                onClick={handleViewSecurityScan}
                className={`p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 shrink-0 ${getSecurityIconState().color}`}
                title={getSecurityIconState().title}
                aria-label="View security scan results"
              >
                {React.createElement(getSecurityIconState().Icon, {
                  className: "h-4 w-4",
                })}
              </button>

              {/* Full Details Button */}
              <button
                type="button"
                onClick={async () => {
                  setShowDetails(true);
                  setLoadingDetails(true);
                  try {
                    const response = await axios.get(
                      `/api/agents${agent.path}`,
                    );
                    setFullAgentDetails(response.data);
                  } catch (error: unknown) {
                    handleApiError(error, "load agent details", onShowToast);
                  } finally {
                    setLoadingDetails(false);
                  }
                }}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-700/50 rounded-lg transition-all duration-200 shrink-0"
                title="View full agent details (JSON)"
              >
                <IconInfoCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2 mb-4">
              {agent.description || "No description available"}
            </p>

            {/* Tags */}
            {agent.tags && agent.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {agent.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs font-medium bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-sm"
                  >
                    #{tag}
                  </span>
                ))}
                {agent.tags.length > 3 && (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-sm">
                    +{agent.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="px-5 pb-4 overflow-visible">
            <div className="grid grid-cols-2 gap-4 overflow-visible">
              <StarRatingWidget
                resourceType="agents"
                path={agent.path}
                initialRating={agent.rating || 0}
                initialCount={agent.rating_details?.length || 0}
                authToken={authToken}
                onShowToast={onShowToast}
                onRatingUpdate={(newRating) => {
                  // Update local agent rating when user submits rating
                  if (onAgentUpdate) {
                    onAgentUpdate(agent.path, { rating: newRating });
                  }
                }}
                onDropdownChange={setIsRatingDropdownOpen}
              />
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-50 dark:bg-cyan-900/30 rounded-sm">
                  <IconCpu className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {agent.usersCount || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Users
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto px-5 py-4 border-t border-cyan-200/50 dark:border-cyan-700/50 bg-linear-to-r from-cyan-50/80 to-blue-50/50 dark:from-cyan-900/20 dark:to-blue-900/10 rounded-b-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status Indicators */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      agent.enabled
                        ? "bg-green-400 shadow-lg shadow-green-400/30"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {agent.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="w-px h-4 bg-cyan-200 dark:bg-cyan-600" />

                {/* Health Badge - New Component */}
                <HealthBadge
                  status={getHealthStatus(agent.status)}
                  size="sm"
                  lastChecked={agent.last_checked_time}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Last Checked */}
                {(() => {
                  const timeText = formatTimeSince(agent.last_checked_time);
                  return agent.last_checked_time && timeText ? (
                    <div className="text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1.5">
                      <IconClock className="h-3.5 w-3.5" />
                      <span>{timeText}</span>
                    </div>
                  ) : null;
                })()}

                {/* Refresh Button - only show if user has health_check_agent permission */}
                {canHealthCheck && (
                  <button
                    type="button"
                    onClick={handleRefreshHealth}
                    disabled={loadingRefresh}
                    className="p-2.5 text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-all duration-200 disabled:opacity-50"
                    title="Refresh agent health status"
                  >
                    <IconRefresh
                      className={`h-4 w-4 ${loadingRefresh ? "animate-spin" : ""}`}
                    />
                  </button>
                )}

                {/* Toggle Switch - only show if user has toggle_agent permission */}
                {canToggle && (
                  <label
                    className="relative inline-flex items-center cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={agent.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggle(agent.path, e.target.checked);
                      }}
                      className="sr-only peer"
                    />
                    <div
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                        agent.enabled
                          ? "bg-cyan-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                          agent.enabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <AgentDetailsModal
          agent={agent}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          loading={loadingDetails}
          fullDetails={fullAgentDetails}
          onCopy={handleCopyDetails}
        />

        <SecurityScanModal
          resourceName={agent.name}
          resourceType="agent"
          isOpen={showSecurityScan}
          onClose={() => setShowSecurityScan(false)}
          loading={loadingSecurityScan}
          scanResult={securityScanResult}
          onRescan={canModify ? handleRescan : undefined}
          canRescan={canModify}
          onShowToast={onShowToast}
        />
      </>
    );
  },
);

AgentCard.displayName = "AgentCard";

export default AgentCard;
