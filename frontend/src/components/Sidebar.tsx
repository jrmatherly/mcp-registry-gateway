import {
  IconArrowLeft,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClipboard,
  IconDownload,
  IconFilter,
  IconKey,
  IconX,
} from "@tabler/icons-react";
import axios from "axios";
import type React from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { getScopeDescription } from "../constants";
import { useAuth } from "../contexts/AuthContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  stats: {
    total: number;
    enabled: number;
    disabled: number;
    withIssues: number;
  };
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  stats,
  activeFilter,
  setActiveFilter,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [showScopes, setShowScopes] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenData, setTokenData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>("");

  const filters = [
    { key: "all", label: "All Services", count: "total" },
    { key: "enabled", label: "Enabled", count: "enabled" },
    { key: "disabled", label: "Disabled", count: "disabled" },
    { key: "unhealthy", label: "With Issues", count: "withIssues" },
  ];

  const isTokenPage = location.pathname === "/generate-token";

  const fetchAdminTokens = async () => {
    setLoading(true);
    setError("");
    try {
      const requestData = {
        description: "Generated via sidebar",
        expires_in_hours: 8,
      };

      const response = await axios.post("/api/tokens/generate", requestData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        setTokenData(response.data);
        setShowTokenModal(true);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || "Failed to generate token");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTokens = async () => {
    if (!tokenData) return;

    const formattedData = JSON.stringify(tokenData, null, 2);
    try {
      await navigator.clipboard.writeText(formattedData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownloadTokens = () => {
    if (!tokenData) return;

    const formattedData = JSON.stringify(tokenData, null, 2);
    const blob = new Blob([formattedData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mcp-registry-api-tokens-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Conditional Content */}
      {isTokenPage ? (
        /* Token Page - Show navigation and user info */
        <>
          {/* Navigation Links */}
          <div className="p-4 md:p-6 border-b border-gray-200/50 dark:border-white/6">
            <div className="space-y-2">
              <Link
                to="/"
                className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent flex items-center gap-3"
                onClick={() => isMobile && setSidebarOpen(false)}
                tabIndex={0}
              >
                <IconArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>

              <Link
                to="/generate-token"
                className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-primary-500 bg-linear-to-r from-primary-500/15 to-indigo-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/30 shadow-sm flex items-center gap-3"
                tabIndex={0}
              >
                <IconKey className="h-4 w-4" />
                <span>Generate Token</span>
              </Link>
            </div>
          </div>

          {/* User Access Information */}
          {user && (
            <div className="p-4 md:p-6 border-b border-gray-200/50 dark:border-white/6">
              <div className="p-3 bg-white/60 dark:bg-white/3 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/10">
                <div className="text-sm">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    {user.is_admin ? (
                      <span className="text-green-600 dark:text-green-400">
                        Admin Access
                      </span>
                    ) : user.can_modify_servers ? (
                      <span className="text-blue-600 dark:text-blue-400">
                        Modify Access
                      </span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-300">
                        Read-only Access
                      </span>
                    )}
                    {user.auth_method === "oauth2" && user.provider && (
                      <span className="ml-1">({user.provider})</span>
                    )}
                  </div>

                  {/* Scopes toggle */}
                  {!user.is_admin && user.scopes && user.scopes.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowScopes(!showScopes)}
                        className="flex items-center justify-between w-full text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors py-1"
                      >
                        <span>Scopes ({user.scopes.length})</span>
                        {showScopes ? (
                          <IconChevronUp className="h-3 w-3" />
                        ) : (
                          <IconChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {showScopes && (
                        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                          {user.scopes.map((scope) => (
                            <div
                              key={scope}
                              className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-xs"
                            >
                              <div className="font-medium text-blue-800 dark:text-blue-200">
                                {scope}
                              </div>
                              <div className="text-blue-600 dark:text-blue-300 mt-1">
                                {getScopeDescription(scope)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Token Generation Help */}
          <div className="flex-1 p-4 md:p-6">
            <div className="text-center p-4 bg-white/50 dark:bg-white/2 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-linear-to-br from-primary-500/20 to-indigo-500/20 flex items-center justify-center border border-primary-300 dark:border-primary-600/50">
                <IconKey className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Token Generation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create personal access tokens for programmatic access to MCP
                servers
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 text-left">
                <p>• Tokens inherit your current permissions</p>
                <p>• Configure expiration time and scopes</p>
                <p>• Use tokens for programmatic access</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Dashboard - Show user info, filters and stats */
        <>
          {/* User Info Header */}
          <div className="p-4 md:p-6 border-b border-gray-200/50 dark:border-white/6">
            {/* User Access Information */}
            {user && (
              <div className="p-3 bg-white/60 dark:bg-white/3 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/10">
                <div className="text-sm">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    {user.is_admin ? (
                      <span className="text-green-600 dark:text-green-400">
                        Admin Access
                      </span>
                    ) : user.can_modify_servers ? (
                      <span className="text-blue-600 dark:text-blue-400">
                        Modify Access
                      </span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-300">
                        Read-only Access
                      </span>
                    )}
                    {user.auth_method === "oauth2" && user.provider && (
                      <span className="ml-1">({user.provider})</span>
                    )}
                  </div>

                  {/* JWT Token Button - Available to all users */}
                  <div className="mb-2">
                    <Button
                      type="button"
                      onClick={fetchAdminTokens}
                      disabled={loading}
                      className="w-full"
                      size="sm"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <IconKey className="h-3 w-3" />
                          <span>Get JWT Token</span>
                        </>
                      )}
                    </Button>
                    {error && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    )}
                  </div>

                  {/* Scopes toggle */}
                  {!user.is_admin && user.scopes && user.scopes.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowScopes(!showScopes)}
                        className="flex items-center justify-between w-full text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors py-1"
                      >
                        <span>Scopes ({user.scopes.length})</span>
                        {showScopes ? (
                          <IconChevronUp className="h-3 w-3" />
                        ) : (
                          <IconChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {showScopes && (
                        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                          {user.scopes.map((scope) => (
                            <div
                              key={scope}
                              className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-sm text-xs"
                            >
                              <div className="font-medium text-blue-800 dark:text-blue-200">
                                {scope}
                              </div>
                              <div className="text-blue-600 dark:text-blue-300 mt-1">
                                {getScopeDescription(scope)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters Section */}
          <div className="flex-1 p-4 md:p-6">
            <div className="flex items-center space-x-2 mb-4">
              <IconFilter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Filter Services
              </h3>
            </div>

            <div className="space-y-2">
              {filters.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-primary-500 ${
                    activeFilter === filter.key
                      ? "bg-linear-to-r from-primary-500/15 to-indigo-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/30 shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent"
                  }`}
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between">
                    <span>{filter.label}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full backdrop-blur-sm ${
                        activeFilter === filter.key
                          ? "bg-primary-500/20 text-primary-600 dark:text-primary-300"
                          : "bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {stats[filter.count as keyof typeof stats]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Statistics Section */}
          <div className="border-t border-gray-200/50 dark:border-white/6 p-4 md:p-6">
            <div className="flex items-center space-x-2 mb-4">
              <IconChartBar className="h-5 w-5 text-primary-500" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Statistics
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white/50 dark:bg-white/2 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/8">
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {stats.total}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-300">
                  Total
                </div>
              </div>
              <div className="text-center p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.enabled}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  Enabled
                </div>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-white/2 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-white/8">
                <div className="text-xl font-semibold text-gray-500 dark:text-gray-300">
                  {stats.disabled}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-300">
                  Disabled
                </div>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-xl border border-red-500/30">
                <div className="text-xl font-semibold text-red-600 dark:text-red-400">
                  {stats.withIssues}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Issues
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile sidebar - using Dialog */}
      {isMobile && (
        <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <DialogContent
            className="fixed inset-y-0 left-0 w-full max-w-xs p-0 rounded-none border-r border-gray-200/50 dark:border-white/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300"
            showCloseButton={false}
          >
            <div className="absolute right-[-48px] top-4">
              <button
                type="button"
                className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <IconX className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/80 dark:bg-gray-900/95 backdrop-blur-xl h-full">
              <SidebarContent />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div
          className={cn(
            "fixed left-0 top-16 bottom-0 z-40 w-64 lg:w-72 xl:w-80 bg-white/80 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/30 dark:border-white/5 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-8px_rgba(0,0,0,0.4)] overflow-y-auto transition-transform duration-300",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent />
        </div>
      )}

      {/* Token Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="max-w-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-gray-200/50 dark:border-white/10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-500/20 to-indigo-500/20 flex items-center justify-center border border-primary-300 dark:border-primary-600/50">
                <IconKey className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <DialogTitle>JWT Access Token</DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Generated for API authentication</p>
              </div>
            </div>
          </DialogHeader>

          {tokenData && (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={handleCopyTokens}
                  variant="default"
                  size="sm"
                  className={copied ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {copied ? (
                    <>
                      <IconCheck className="h-4 w-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <IconClipboard className="h-4 w-4" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleDownloadTokens}
                  variant="outline"
                  size="sm"
                >
                  <IconDownload className="h-4 w-4" />
                  <span>Download JSON</span>
                </Button>
              </div>

              {/* Token Data Display */}
              <div className="rounded-xl overflow-hidden border border-gray-700 dark:border-white/10">
                <div className="bg-gray-800 dark:bg-gray-900/80 text-gray-300 px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-gray-700 dark:border-white/10">
                  <span>token_response.json</span>
                  <span className="text-gray-500">JSON</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <pre className="p-4 bg-gray-900 dark:bg-[#0d1117] text-gray-100 text-xs whitespace-pre-wrap break-all font-mono leading-relaxed">
                    {JSON.stringify(tokenData, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Close Button */}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTokenModal(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;
