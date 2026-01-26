import {
	IconClock,
	IconPencil,
	IconRefresh,
	IconSettings,
	IconShield,
	IconShieldExclamation,
	IconTool,
	IconX,
} from "@tabler/icons-react";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import type {
	SecurityScanResult,
	Server,
	ShowToastCallback,
	Tool,
} from "../types";
import { formatTimeSince, getErrorMessage } from "../utils";
import SecurityScanModal from "./SecurityScanModal";
import ServerConfigModal from "./ServerConfigModal";
import StarRatingWidget from "./StarRatingWidget";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	HealthBadge,
	getHealthStatus,
} from "@/components/ui";

// Re-export Server type for consumers that import from this file
export type { Server };

interface ServerCardProps {
	server: Server;
	onToggle: (path: string, enabled: boolean) => void;
	onEdit?: (server: Server) => void;
	canModify?: boolean;
	canHealthCheck?: boolean;
	canToggle?: boolean;
	onRefreshSuccess?: () => void;
	onShowToast?: ShowToastCallback;
	onServerUpdate?: (path: string, updates: Partial<Server>) => void;
	authToken?: string | null;
}

const ServerCard: React.FC<ServerCardProps> = React.memo(
	({
		server,
		onToggle,
		onEdit,
		canModify,
		canHealthCheck = true,
		canToggle = true,
		onRefreshSuccess,
		onShowToast,
		onServerUpdate,
		authToken,
	}) => {
		const [tools, setTools] = useState<Tool[]>([]);
		const [loadingTools, setLoadingTools] = useState(false);
		const [showTools, setShowTools] = useState(false);
		const [showConfig, setShowConfig] = useState(false);
		const [loadingRefresh, setLoadingRefresh] = useState(false);
		const [showSecurityScan, setShowSecurityScan] = useState(false);
		const [securityScanResult, setSecurityScanResult] =
			useState<SecurityScanResult | null>(null);
		const [loadingSecurityScan, setLoadingSecurityScan] = useState(false);

		// Fetch security scan status on mount to show correct icon color
		useEffect(() => {
			const fetchSecurityScan = async () => {
				try {
					const headers = authToken
						? { Authorization: `Bearer ${authToken}` }
						: undefined;
					const response = await axios.get(
						`/api/servers${server.path}/security-scan`,
						headers ? { headers } : undefined,
					);
					setSecurityScanResult(response.data);
				} catch {
					// Silently ignore - no scan result available
				}
			};
			fetchSecurityScan();
		}, [server.path, authToken]);

		const handleViewTools = useCallback(async () => {
			if (loadingTools) return;

			setLoadingTools(true);
			try {
				const response = await axios.get(`/api/tools${server.path}`);
				setTools(response.data.tools || []);
				setShowTools(true);
			} catch (err: unknown) {
				const message = getErrorMessage(err, "Failed to fetch tools");
				if (onShowToast) {
					onShowToast(message, "error");
				}
			} finally {
				setLoadingTools(false);
			}
		}, [server.path, loadingTools, onShowToast]);

		const handleRefreshHealth = useCallback(async () => {
			if (loadingRefresh) return;

			setLoadingRefresh(true);
			try {
				// Extract service name from path (remove leading slash)
				const serviceName = server.path.replace(/^\//, "");

				const response = await axios.post(`/api/refresh/${serviceName}`);

				// Update just this server instead of triggering global refresh
				if (onServerUpdate && response.data) {
					const updates: Partial<Server> = {
						status:
							response.data.status === "healthy"
								? "healthy"
								: response.data.status === "healthy-auth-expired"
									? "healthy-auth-expired"
									: response.data.status === "unhealthy"
										? "unhealthy"
										: "unknown",
						last_checked_time: response.data.last_checked_iso,
						num_tools: response.data.num_tools,
					};

					onServerUpdate(server.path, updates);
				} else if (onRefreshSuccess) {
					// Fallback to global refresh if onServerUpdate is not provided
					onRefreshSuccess();
				}

				if (onShowToast) {
					onShowToast("Health status refreshed successfully", "success");
				}
			} catch (err: unknown) {
				const message = getErrorMessage(err, "Failed to refresh health status");
				if (onShowToast) {
					onShowToast(message, "error");
				}
			} finally {
				setLoadingRefresh(false);
			}
		}, [
			server.path,
			loadingRefresh,
			onRefreshSuccess,
			onShowToast,
			onServerUpdate,
		]);

		const handleViewSecurityScan = useCallback(async () => {
			if (loadingSecurityScan) return;

			setShowSecurityScan(true);
			setLoadingSecurityScan(true);
			try {
				const headers = authToken
					? { Authorization: `Bearer ${authToken}` }
					: undefined;
				const response = await axios.get(
					`/api/servers${server.path}/security-scan`,
					headers ? { headers } : undefined,
				);
				setSecurityScanResult(response.data);
			} catch (err: unknown) {
				// 404 is expected when no scan exists - only show error for other failures
				if (axios.isAxiosError(err) && err.response?.status === 404) {
					setSecurityScanResult(null);
					return;
				}
				const message = getErrorMessage(
					err,
					"Failed to load security scan results",
				);
				if (onShowToast) {
					onShowToast(message, "error");
				}
				setSecurityScanResult(null);
			} finally {
				setLoadingSecurityScan(false);
			}
		}, [server.path, authToken, loadingSecurityScan, onShowToast]);

		const handleRescan = useCallback(async () => {
			const headers = authToken
				? { Authorization: `Bearer ${authToken}` }
				: undefined;
			const response = await axios.post(
				`/api/servers${server.path}/rescan`,
				undefined,
				headers ? { headers } : undefined,
			);
			setSecurityScanResult(response.data);
		}, [server.path, authToken]);

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
				securityScanResult.critical_issues > 0 ||
				securityScanResult.high_severity > 0 ||
				securityScanResult.medium_severity > 0 ||
				securityScanResult.low_severity > 0;
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

		// Generate MCP configuration for the server
		// Check if this is an Anthropic registry server
		const isAnthropicServer = server.tags?.includes("anthropic-registry");

		// Check if this server has security pending
		const isSecurityPending = server.tags?.includes("security-pending");

		return (
			<>
				<div
					className={`group rounded-2xl h-full flex flex-col transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 ${
						isAnthropicServer
							? "bg-linear-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-purple-300/50 dark:border-purple-600/50 hover:border-purple-400/70 dark:hover:border-purple-500/70 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20"
							: "glass-card"
					}`}
				>
					{/* Header */}
					<div className="p-5 pb-4">
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-3">
									<h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
										{server.name}
									</h3>
									{server.official && (
										<span className="px-2.5 py-0.5 text-xs font-semibold rounded-full shrink-0 bg-linear-to-r from-primary-500/20 to-indigo-500/20 text-primary-600 dark:text-primary-300 border border-primary-500/30 shadow-sm">
											OFFICIAL
										</span>
									)}
									{isAnthropicServer && (
										<span className="px-2 py-0.5 text-xs font-semibold bg-linear-to-r from-purple-100 to-indigo-100 text-purple-700 dark:from-purple-900/30 dark:to-indigo-900/30 dark:text-purple-300 rounded-full shrink-0 border border-purple-200 dark:border-purple-600">
											ANTHROPIC
										</span>
									)}
									{/* Check if this is an ASOR server */}
									{server.tags?.includes("asor") && (
										<span className="px-2 py-0.5 text-xs font-semibold bg-linear-to-r from-orange-100 to-red-100 text-orange-700 dark:from-orange-900/30 dark:to-red-900/30 dark:text-orange-300 rounded-full shrink-0 border border-orange-200 dark:border-orange-600">
											ASOR
										</span>
									)}
									{isSecurityPending && (
										<span className="px-2 py-0.5 text-xs font-semibold bg-linear-to-r from-amber-100 to-orange-100 text-amber-700 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-300 rounded-full shrink-0 border border-amber-200 dark:border-amber-600">
											SECURITY PENDING
										</span>
									)}
								</div>

								<code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-sm font-mono">
									{server.path}
								</code>
							</div>

							{canModify && (
								<button
									type="button"
									className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 shrink-0"
									onClick={() => onEdit?.(server)}
									title="Edit server"
									aria-label={`Edit ${server.name}`}
								>
									<IconPencil className="h-4 w-4" />
								</button>
							)}

							{/* Configuration Generator Button */}
							<button
								type="button"
								onClick={() => setShowConfig(true)}
								className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-700/50 rounded-lg transition-all duration-200 shrink-0"
								title="Copy mcp.json configuration"
								aria-label="Generate MCP configuration"
							>
								<IconSettings className="h-4 w-4" />
							</button>

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
						</div>

						{/* Description */}
						<p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2 mb-4">
							{server.description || "No description available"}
						</p>

						{/* Tags */}
						{server.tags && server.tags.length > 0 && (
							<div className="flex flex-wrap gap-1.5 mb-4">
								{server.tags.slice(0, 3).map((tag) => (
									<span
										key={tag}
										className="px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-sm"
									>
										#{tag}
									</span>
								))}
								{server.tags.length > 3 && (
									<span className="px-2 py-1 text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-sm">
										+{server.tags.length - 3}
									</span>
								)}
							</div>
						)}
					</div>

					{/* Stats */}
					<div className="px-5 pb-4">
						<div className="grid grid-cols-2 gap-4">
							<StarRatingWidget
								resourceType="servers"
								path={server.path}
								initialRating={server.num_stars || 0}
								initialCount={server.rating_details?.length || 0}
								authToken={authToken}
								onShowToast={onShowToast}
								onRatingUpdate={(newRating) => {
									// Update local server rating when user submits rating
									if (onServerUpdate) {
										onServerUpdate(server.path, { num_stars: newRating });
									}
								}}
							/>
							<div className="flex items-center gap-2">
								{(server.num_tools || 0) > 0 ? (
									<button
										type="button"
										onClick={handleViewTools}
										disabled={loadingTools}
										className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 -mx-2 -my-1 rounded-sm transition-all"
										title="View tools"
									>
										<div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-sm">
											<IconTool className="h-4 w-4" />
										</div>
										<div>
											<div className="text-sm font-semibold">
												{server.num_tools}
											</div>
											<div className="text-xs">Tools</div>
										</div>
									</button>
								) : (
									<div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
										<div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-sm">
											<IconTool className="h-4 w-4" />
										</div>
										<div>
											<div className="text-sm font-semibold">
												{server.num_tools || 0}
											</div>
											<div className="text-xs">Tools</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="mt-auto px-5 py-4 border-t border-gray-200/50 dark:border-white/6 bg-linear-to-r from-gray-50/80 to-gray-100/50 dark:from-white/2 dark:to-white/1 rounded-b-2xl backdrop-blur-sm">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								{/* Status Indicators */}
								<div className="flex items-center gap-2">
									<div
										className={`w-2.5 h-2.5 rounded-full ${
											server.enabled
												? "bg-green-400 shadow-lg shadow-green-400/30"
												: "bg-gray-300 dark:bg-gray-600"
										}`}
									/>
									<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
										{server.enabled ? "Enabled" : "Disabled"}
									</span>
								</div>

								<div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />

								{/* Health Badge - New Component */}
								<HealthBadge
									status={getHealthStatus(server.status)}
									size="sm"
									lastChecked={server.last_checked_time}
								/>
							</div>

							{/* Controls */}
							<div className="flex items-center gap-3">
								{/* Last Checked */}
								{(() => {
									const timeText = formatTimeSince(server.last_checked_time);
									return server.last_checked_time && timeText ? (
										<div className="text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1.5">
											<IconClock className="h-3.5 w-3.5" />
											<span>{timeText}</span>
										</div>
									) : null;
								})()}

								{/* Refresh Button - only show if user has health_check_service permission */}
								{canHealthCheck && (
									<button
										type="button"
										onClick={handleRefreshHealth}
										disabled={loadingRefresh}
										className="p-2.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 disabled:opacity-50"
										title="Refresh health status"
										aria-label={`Refresh health status for ${server.name}`}
									>
										<IconRefresh
											className={`h-4 w-4 ${loadingRefresh ? "animate-spin" : ""}`}
										/>
									</button>
								)}

								{/* Toggle Switch - only show if user has toggle_service permission */}
								{canToggle && (
									<label className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={server.enabled}
											onChange={(e) => onToggle(server.path, e.target.checked)}
											className="sr-only peer"
											aria-label={`Enable ${server.name}`}
										/>
										<div
											className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${
												server.enabled
													? "bg-blue-600"
													: "bg-gray-300 dark:bg-gray-600"
											}`}
										>
											<div
												className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${
													server.enabled ? "translate-x-6" : "translate-x-0"
												}`}
											/>
										</div>
									</label>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Tools Modal */}
				<Dialog open={showTools} onOpenChange={setShowTools}>
					<DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
						<DialogHeader>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-300 dark:border-blue-600/50">
										<IconTool className="h-5 w-5 text-blue-600 dark:text-blue-400" />
									</div>
									<div>
										<DialogTitle>Tools for {server.name}</DialogTitle>
										<p className="text-sm text-gray-500 dark:text-gray-400">{tools.length} tool{tools.length !== 1 ? 's' : ''} available</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setShowTools(false)}
									className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
								>
									<IconX className="h-5 w-5" />
								</button>
							</div>
						</DialogHeader>

						<div className="space-y-3 mt-2">
							{tools.length > 0 ? (
								tools.map((tool) => (
									<div
										key={tool.name}
										className="bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors"
									>
										<h4 className="font-semibold text-gray-900 dark:text-white font-mono text-sm">
											{tool.name}
										</h4>
										{tool.description && (
											<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
												{tool.description}
											</p>
										)}
										{tool.schema && (
											<details className="text-xs mt-3">
												<summary className="cursor-pointer text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1">
													<span>▶</span> View Schema
												</summary>
												<div className="mt-2 rounded-lg overflow-hidden border border-gray-700 dark:border-white/10">
													<div className="bg-gray-800 dark:bg-gray-900/80 text-gray-300 px-3 py-1.5 text-xs font-mono border-b border-gray-700 dark:border-white/10">schema.json</div>
													<pre className="p-3 bg-gray-900 dark:bg-[#0d1117] overflow-x-auto text-gray-100 font-mono leading-relaxed">
														{JSON.stringify(tool.schema, null, 2)}
													</pre>
												</div>
											</details>
										)}
									</div>
								))
							) : (
								<div className="text-center py-8">
									<div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
										<IconTool className="h-8 w-8 text-gray-400" />
									</div>
									<p className="text-gray-500 dark:text-gray-400">No tools available for this server.</p>
								</div>
							)}
						</div>
					</DialogContent>
				</Dialog>

				<ServerConfigModal
					server={server}
					isOpen={showConfig}
					onClose={() => setShowConfig(false)}
					onShowToast={onShowToast}
				/>

				<SecurityScanModal
					resourceName={server.name}
					resourceType="server"
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

ServerCard.displayName = "ServerCard";

export default ServerCard;
