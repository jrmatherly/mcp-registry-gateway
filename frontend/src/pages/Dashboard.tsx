import {
	ArrowPathIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import AgentCard from "../components/AgentCard";
import EditAgentModal from "../components/EditAgentModal";
import EditServerModal from "../components/EditServerModal";
import EmptyState from "../components/EmptyState";
import QuickActionPills from "../components/QuickActionPills";
import SemanticSearchResults from "../components/SemanticSearchResults";
import ServerCard from "../components/ServerCard";
import Toast from "../components/Toast";
import { API_ENDPOINTS, hasExternalRegistryTag } from "../constants";
import { useAuth } from "../contexts/AuthContext";
import { useSemanticSearch } from "../hooks/useSemanticSearch";
import { useServerStats } from "../hooks/useServerStats";
import type {
	ActiveFilter,
	Agent,
	EditAgentForm,
	EditServerForm,
	Server,
	ToastType,
} from "../types";
import { filterEntities, getErrorMessage } from "../utils";

interface DashboardProps {
	activeFilter?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ activeFilter = "all" }) => {
	const navigate = useNavigate();
	const {
		servers,
		agents: agentsFromStats,
		loading,
		error,
		refreshData,
		setServers,
		setAgents,
	} = useServerStats();
	const { user } = useAuth();
	const [searchTerm, setSearchTerm] = useState("");
	const [committedQuery, setCommittedQuery] = useState("");
	const [showRegisterModal, setShowRegisterModal] = useState(false);
	const [registerForm, setRegisterForm] = useState({
		name: "",
		path: "",
		proxyPass: "",
		description: "",
		official: false,
		tags: [] as string[],
	});
	const [registerLoading, setRegisterLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [editingServer, setEditingServer] = useState<Server | null>(null);
	const [editForm, setEditForm] = useState<EditServerForm>({
		name: "",
		path: "",
		proxyPass: "",
		description: "",
		tags: [],
		license: "N/A",
		num_tools: 0,
		num_stars: 0,
		is_python: false,
	});
	const [editLoading, setEditLoading] = useState(false);
	const [toast, setToast] = useState<{
		message: string;
		type: ToastType;
	} | null>(null);

	// Agent state management - using agents from useServerStats hook
	const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

	// View filter state
	const [viewFilter, setViewFilter] = useState<
		"all" | "servers" | "agents" | "external"
	>("all");
	const [editAgentForm, setEditAgentForm] = useState<EditAgentForm>({
		name: "",
		path: "",
		description: "",
		version: "",
		visibility: "private",
		trust_level: "community",
		tags: [],
	});
	const [editAgentLoading, setEditAgentLoading] = useState(false);

	const handleAgentUpdate = useCallback(
		(path: string, updates: Partial<Agent>) => {
			setAgents((prevAgents) =>
				prevAgents.map((agent) =>
					agent.path === path ? { ...agent, ...updates } : agent,
				),
			);
		},
		[setAgents],
	);

	// Helper function to check if user has a specific UI permission for a service
	const hasUiPermission = useCallback(
		(permission: string, servicePath: string): boolean => {
			const permissions = user?.ui_permissions?.[permission];
			if (!permissions) return false;

			// Extract service name from path (remove leading slash)
			const serviceName = servicePath.replace(/^\//, "");

			// Check if user has 'all' permission or specific service permission
			return permissions.includes("all") || permissions.includes(serviceName);
		},
		[user?.ui_permissions],
	);

	// Separate internal and external registry servers using shared helper
	const internalServers = useMemo(() => {
		return servers.filter((s) => !hasExternalRegistryTag(s.tags));
	}, [servers]);

	const externalServers = useMemo(() => {
		return servers.filter((s) => hasExternalRegistryTag(s.tags));
	}, [servers]);

	// Separate internal and external registry agents
	// Transform Server[] to Agent[] for agents from useServerStats
	const agents = useMemo(() => {
		return agentsFromStats.map(
			(a): Agent => ({
				name: a.name,
				path: a.path,
				description: a.description,
				enabled: a.enabled,
				tags: a.tags,
				rating: a.rating,
				status: a.status,
				last_checked_time: a.last_checked_time,
				usersCount: a.usersCount,
				url: "", // Will be populated if needed
				version: "",
				visibility: "public",
				trust_level: "community",
			}),
		);
	}, [agentsFromStats]);

	const internalAgents = useMemo(() => {
		return agents.filter((a) => !hasExternalRegistryTag(a.tags));
	}, [agents]);

	const externalAgents = useMemo(() => {
		return agents.filter((a) => hasExternalRegistryTag(a.tags));
	}, [agents]);

	// Semantic search
	const semanticEnabled = committedQuery.trim().length >= 2;
	const {
		results: semanticResults,
		loading: semanticLoading,
		error: semanticError,
	} = useSemanticSearch(committedQuery, {
		minLength: 2,
		maxResults: 12,
		enabled: semanticEnabled,
	});

	const semanticServers = semanticResults?.servers ?? [];
	const semanticTools = semanticResults?.tools ?? [];
	const semanticAgents = semanticResults?.agents ?? [];
	const semanticDisplayQuery =
		semanticResults?.query || committedQuery || searchTerm;
	const semanticSectionVisible = semanticEnabled;
	const shouldShowFallbackGrid =
		semanticSectionVisible &&
		(Boolean(semanticError) ||
			(!semanticLoading &&
				semanticServers.length === 0 &&
				semanticTools.length === 0 &&
				semanticAgents.length === 0));

	// Filter servers based on activeFilter and searchTerm
	const filteredServers = useMemo(() => {
		return filterEntities(
			internalServers,
			activeFilter as ActiveFilter,
			searchTerm,
		);
	}, [internalServers, activeFilter, searchTerm]);

	// Filter external servers based on searchTerm (no status filter for external)
	const filteredExternalServers = useMemo(() => {
		return filterEntities(externalServers, "all", searchTerm);
	}, [externalServers, searchTerm]);

	// Filter external agents based on searchTerm (no status filter for external)
	const filteredExternalAgents = useMemo(() => {
		return filterEntities(externalAgents, "all", searchTerm);
	}, [externalAgents, searchTerm]);

	// Filter agents based on activeFilter and searchTerm
	const filteredAgents = useMemo(() => {
		return filterEntities(
			internalAgents,
			activeFilter as ActiveFilter,
			searchTerm,
		);
	}, [internalAgents, activeFilter, searchTerm]);

	useEffect(() => {
		if (searchTerm.trim().length === 0 && committedQuery.length > 0) {
			setCommittedQuery("");
		}
	}, [searchTerm, committedQuery]);

	const handleSemanticSearch = useCallback(() => {
		const trimmed = searchTerm.trim();
		setCommittedQuery(trimmed);
	}, [searchTerm]);

	const handleClearSearch = useCallback(() => {
		setSearchTerm("");
		setCommittedQuery("");
	}, []);

	const handleChangeViewFilter = useCallback(
		(filter: typeof viewFilter) => {
			setViewFilter(filter);
			if (semanticSectionVisible) {
				setSearchTerm("");
				setCommittedQuery("");
			}
		},
		[semanticSectionVisible],
	);

	const handleRefreshHealth = async () => {
		setRefreshing(true);
		try {
			await refreshData(); // Refresh both servers and agents from useServerStats
		} finally {
			setRefreshing(false);
		}
	};

	const handleEditServer = useCallback(async (server: Server) => {
		try {
			// Fetch full server details including proxy_pass_url and tags
			const response = await axios.get(
				`${API_ENDPOINTS.SERVER_DETAILS}${server.path}`,
			);
			const serverDetails = response.data;

			setEditingServer(server);
			setEditForm({
				name: serverDetails.server_name || server.name,
				path: server.path,
				proxyPass: serverDetails.proxy_pass_url || "",
				description: serverDetails.description || "",
				tags: serverDetails.tags || [],
				license: serverDetails.license || "N/A",
				num_tools: serverDetails.num_tools || 0,
				num_stars: serverDetails.num_stars || 0,
				is_python: serverDetails.is_python || false,
			});
		} catch {
			// Fallback to basic server data on error
			setEditingServer(server);
			setEditForm({
				name: server.name,
				path: server.path,
				proxyPass: server.proxy_pass_url || "",
				description: server.description || "",
				tags: server.tags || [],
				license: server.license || "N/A",
				num_tools: server.num_tools || 0,
				num_stars: server.num_stars || 0,
				is_python: server.is_python || false,
			});
		}
	}, []);

	const handleEditAgent = useCallback(async (agent: Agent) => {
		// For now, just populate the form with existing data
		// In the future, we might fetch additional details from an API
		setEditingAgent(agent);
		setEditAgentForm({
			name: agent.name,
			path: agent.path,
			description: agent.description || "",
			version: agent.version || "1.0.0",
			visibility: agent.visibility || "private",
			trust_level: agent.trust_level || "community",
			tags: agent.tags || [],
		});
	}, []);

	const handleCloseEdit = () => {
		setEditingServer(null);
		setEditingAgent(null);
	};

	const showToast = useCallback((message: string, type: ToastType) => {
		setToast({ message, type });
	}, []);

	const hideToast = useCallback(() => {
		setToast(null);
	}, []);

	const handleSaveEdit = async () => {
		if (editLoading || !editingServer) return;

		try {
			setEditLoading(true);

			const formData = new FormData();
			formData.append("name", editForm.name);
			formData.append("description", editForm.description);
			formData.append("proxy_pass_url", editForm.proxyPass);
			formData.append("tags", editForm.tags.join(","));
			formData.append("license", editForm.license);
			formData.append("num_tools", editForm.num_tools.toString());
			formData.append("num_stars", editForm.num_stars.toString());
			formData.append("is_python", editForm.is_python.toString());

			// Use the correct edit endpoint with the server path
			await axios.post(
				`${API_ENDPOINTS.SERVER_EDIT}${editingServer.path}`,
				formData,
				{
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
				},
			);

			// Refresh server list
			await refreshData();
			setEditingServer(null);

			showToast("Server updated successfully!", "success");
		} catch (err: unknown) {
			const message = getErrorMessage(err, "Failed to update server");
			showToast(message, "error");
		} finally {
			setEditLoading(false);
		}
	};

	const handleSaveEditAgent = async () => {
		if (editAgentLoading || !editingAgent) return;

		try {
			setEditAgentLoading(true);

			// TODO: Implement agent edit endpoint when backend is ready
			// For now, just show a message
			showToast("Agent editing is not yet implemented", "error");

			// When backend is ready, uncomment and implement:
			// const formData = new FormData();
			// formData.append('name', editAgentForm.name);
			// formData.append('description', editAgentForm.description);
			// formData.append('version', editAgentForm.version);
			// formData.append('visibility', editAgentForm.visibility);
			// formData.append('trust_level', editAgentForm.trust_level);
			// formData.append('tags', editAgentForm.tags.join(','));
			//
			// await axios.post(`/api/agents${editingAgent.path}/edit`, formData, {
			//   headers: {
			//     'Content-Type': 'application/x-www-form-urlencoded',
			//   },
			// });
			//
			// await fetchAgents();
			// setEditingAgent(null);
			// showToast('Agent updated successfully!', 'success');
		} catch (err: unknown) {
			const message = getErrorMessage(err, "Failed to update agent");
			showToast(message, "error");
		} finally {
			setEditAgentLoading(false);
		}
	};

	const handleToggleServer = useCallback(
		async (path: string, enabled: boolean) => {
			// Optimistically update the UI first
			setServers((prevServers) =>
				prevServers.map((server) =>
					server.path === path ? { ...server, enabled } : server,
				),
			);

			try {
				const formData = new FormData();
				formData.append("enabled", enabled ? "on" : "off");

				await axios.post(`${API_ENDPOINTS.SERVER_TOGGLE}${path}`, formData, {
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
				});

				// No need to refresh all data - the optimistic update is enough
				showToast(
					`Server ${enabled ? "enabled" : "disabled"} successfully!`,
					"success",
				);
			} catch (err: unknown) {
				// Revert the optimistic update on error
				setServers((prevServers) =>
					prevServers.map((server) =>
						server.path === path ? { ...server, enabled: !enabled } : server,
					),
				);

				const message = getErrorMessage(err, "Failed to toggle server");
				showToast(message, "error");
			}
		},
		[setServers, showToast],
	);

	const handleToggleAgent = useCallback(
		async (path: string, enabled: boolean) => {
			// Optimistically update the UI first
			setAgents((prevAgents) =>
				prevAgents.map((agent) =>
					agent.path === path ? { ...agent, enabled } : agent,
				),
			);

			try {
				await axios.post(
					`${API_ENDPOINTS.AGENTS}${path}/toggle?enabled=${enabled}`,
				);

				showToast(
					`Agent ${enabled ? "enabled" : "disabled"} successfully!`,
					"success",
				);
			} catch (err: unknown) {
				// Revert the optimistic update on error
				setAgents((prevAgents) =>
					prevAgents.map((agent) =>
						agent.path === path ? { ...agent, enabled: !enabled } : agent,
					),
				);

				const message = getErrorMessage(err, "Failed to toggle agent");
				showToast(message, "error");
			}
		},
		[setAgents, showToast],
	);

	const handleServerUpdate = useCallback(
		(path: string, updates: Partial<Server>) => {
			setServers((prevServers) =>
				prevServers.map((server) =>
					server.path === path ? { ...server, ...updates } : server,
				),
			);
		},
		[setServers],
	);

	const handleRegisterServer = useCallback(() => {
		navigate("/servers/register");
	}, [navigate]);

	const handleRegisterSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (registerLoading) return; // Prevent double submission

			try {
				setRegisterLoading(true);

				const formData = new FormData();
				formData.append("name", registerForm.name);
				formData.append("description", registerForm.description);
				formData.append("path", registerForm.path);
				formData.append("proxy_pass_url", registerForm.proxyPass);
				formData.append("tags", registerForm.tags.join(","));
				formData.append("license", "MIT");

				await axios.post(API_ENDPOINTS.SERVER_REGISTER, formData, {
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
				});

				// Reset form and close modal
				setRegisterForm({
					name: "",
					path: "",
					proxyPass: "",
					description: "",
					official: false,
					tags: [],
				});
				setShowRegisterModal(false);

				// Refresh server list
				await refreshData();

				showToast("Server registered successfully!", "success");
			} catch (err: unknown) {
				const message = getErrorMessage(err, "Failed to register server");
				showToast(message, "error");
			} finally {
				setRegisterLoading(false);
			}
		},
		[registerForm, registerLoading, refreshData, showToast],
	);

	const renderDashboardCollections = () => (
		<>
			{/* MCP Servers Section */}
			{(viewFilter === "all" || viewFilter === "servers") &&
				(filteredServers.length > 0 ||
					(!searchTerm && activeFilter === "all")) && (
					<div className="mb-8">
						<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
							MCP Servers
						</h2>

						{filteredServers.length === 0 ? (
							<EmptyState
								variant="servers"
								searchTerm={searchTerm}
								actionLabel={
									!searchTerm && activeFilter === "all"
										? "Register Server"
										: undefined
								}
								onAction={
									!searchTerm && activeFilter === "all"
										? handleRegisterServer
										: undefined
								}
							/>
						) : (
							<div
								className="grid"
								style={{
									gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
									gap: "clamp(1.5rem, 3vw, 2.5rem)",
								}}
							>
								{filteredServers.map((server) => (
									<ServerCard
										key={server.path}
										server={server}
										onToggle={handleToggleServer}
										onEdit={handleEditServer}
										canModify={user?.can_modify_servers || false}
										canHealthCheck={hasUiPermission(
											"health_check_service",
											server.path,
										)}
										canToggle={hasUiPermission("toggle_service", server.path)}
										onRefreshSuccess={refreshData}
										onShowToast={showToast}
										onServerUpdate={handleServerUpdate}
									/>
								))}
							</div>
						)}
					</div>
				)}

			{/* A2A Agents Section */}
			{(viewFilter === "all" || viewFilter === "agents") &&
				(filteredAgents.length > 0 ||
					(!searchTerm && activeFilter === "all")) && (
					<div className="mb-8">
						<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
							A2A Agents
						</h2>

						{loading ? (
							<div className="flex items-center justify-center py-12">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
							</div>
						) : filteredAgents.length === 0 ? (
							<EmptyState variant="agents" searchTerm={searchTerm} />
						) : (
							<div
								className="grid"
								style={{
									gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
									gap: "clamp(1.5rem, 3vw, 2.5rem)",
								}}
							>
								{filteredAgents.map((agent) => (
									<AgentCard
										key={agent.path}
										agent={agent}
										onToggle={handleToggleAgent}
										onEdit={handleEditAgent}
										canModify={user?.can_modify_servers || false}
										canHealthCheck={hasUiPermission(
											"health_check_agent",
											agent.path,
										)}
										canToggle={hasUiPermission("toggle_agent", agent.path)}
										onRefreshSuccess={refreshData}
										onShowToast={showToast}
										onAgentUpdate={handleAgentUpdate}
									/>
								))}
							</div>
						)}
					</div>
				)}

			{/* External Registries Section */}
			{viewFilter === "external" && (
				<div className="mb-8">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
						External Registries
					</h2>

					{filteredExternalServers.length === 0 &&
					filteredExternalAgents.length === 0 ? (
						<EmptyState
							variant="generic"
							title={
								externalServers.length === 0 && externalAgents.length === 0
									? "No External Registries Available"
									: "No Results Found"
							}
							description={
								externalServers.length === 0 && externalAgents.length === 0
									? "External registry integrations (Anthropic, ASOR, and more) will be available soon"
									: "Press Enter in the search bar to search semantically"
							}
						/>
					) : (
						<div>
							{/* External Servers */}
							{filteredExternalServers.length > 0 && (
								<div className="mb-6">
									<h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
										Servers
									</h3>
									<div
										className="grid"
										style={{
											gridTemplateColumns:
												"repeat(auto-fit, minmax(380px, 1fr))",
											gap: "clamp(1.5rem, 3vw, 2.5rem)",
										}}
									>
										{filteredExternalServers.map((server) => (
											<ServerCard
												key={server.path}
												server={server}
												onToggle={handleToggleServer}
												onEdit={handleEditServer}
												canModify={user?.can_modify_servers || false}
												onRefreshSuccess={refreshData}
												onShowToast={showToast}
												onServerUpdate={handleServerUpdate}
											/>
										))}
									</div>
								</div>
							)}

							{/* External Agents */}
							{filteredExternalAgents.length > 0 && (
								<div>
									<h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
										Agents
									</h3>
									<div
										className="grid"
										style={{
											gridTemplateColumns:
												"repeat(auto-fit, minmax(380px, 1fr))",
											gap: "clamp(1.5rem, 3vw, 2.5rem)",
										}}
									>
										{filteredExternalAgents.map((agent) => (
											<AgentCard
												key={agent.path}
												agent={agent}
												onToggle={handleToggleAgent}
												onEdit={handleEditAgent}
												canModify={user?.can_modify_servers || false}
												canHealthCheck={hasUiPermission(
													"health_check_agent",
													agent.path,
												)}
												canToggle={hasUiPermission("toggle_agent", agent.path)}
												onRefreshSuccess={refreshData}
												onShowToast={showToast}
												onAgentUpdate={handleAgentUpdate}
											/>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Empty state when both are filtered out */}
			{((viewFilter === "all" &&
				filteredServers.length === 0 &&
				filteredAgents.length === 0) ||
				(viewFilter === "servers" && filteredServers.length === 0) ||
				(viewFilter === "agents" && filteredAgents.length === 0)) &&
				(searchTerm || activeFilter !== "all") && (
					<div className="text-center py-16">
						<div className="text-gray-400 text-xl mb-4">No items found</div>
						<p className="text-gray-500 dark:text-gray-300 text-base max-w-md mx-auto">
							Press Enter in the search bar to search semantically
						</p>
					</div>
				)}
		</>
	);

	// Show error state
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-red-500 text-lg">Failed to load data</div>
				<p className="text-gray-500 text-center">{error}</p>
				<button
					type="button"
					onClick={handleRefreshHealth}
					className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
				>
					Try Again
				</button>
			</div>
		);
	}

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
			</div>
		);
	}

	return (
		<>
			{/* Toast Notification */}
			{toast && (
				<Toast message={toast.message} type={toast.type} onClose={hideToast} />
			)}

			<div className="flex flex-col h-full">
				{/* Quick Action Pills */}
				<QuickActionPills
					onRegisterServer={
						user?.can_modify_servers ? handleRegisterServer : undefined
					}
					onRefresh={handleRefreshHealth}
					onViewServers={() => handleChangeViewFilter("servers")}
					onViewAgents={() => handleChangeViewFilter("agents")}
					isRefreshing={refreshing}
				/>

				{/* Fixed Header Section */}
				<div className="shrink-0 space-y-4 pb-4">
					{/* View Filter Tabs */}
					<div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
						<button
							type="button"
							onClick={() => handleChangeViewFilter("all")}
							className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
								viewFilter === "all"
									? "border-purple-500 text-purple-600 dark:text-purple-400"
									: "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
							}`}
						>
							All
						</button>
						<button
							type="button"
							onClick={() => handleChangeViewFilter("servers")}
							className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
								viewFilter === "servers"
									? "border-blue-500 text-blue-600 dark:text-blue-400"
									: "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
							}`}
						>
							MCP Servers Only
						</button>
						<button
							type="button"
							onClick={() => handleChangeViewFilter("agents")}
							className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
								viewFilter === "agents"
									? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
									: "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
							}`}
						>
							A2A Agents Only
						</button>
						<button
							type="button"
							onClick={() => handleChangeViewFilter("external")}
							className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
								viewFilter === "external"
									? "border-green-500 text-green-600 dark:text-green-400"
									: "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
							}`}
						>
							External Registries
						</button>
					</div>

					{/* Search Bar and Refresh Button */}
					<div className="flex gap-4 items-center">
						<div className="relative flex-1">
							<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
								<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
							</div>
							<input
								type="text"
								placeholder="Search servers, agents, descriptions, or tags… (Press Enter to run semantic search; typing filters locally.)"
								className="input pl-10 w-full"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleSemanticSearch();
									}
								}}
							/>
							{searchTerm && (
								<button
									type="button"
									onClick={handleClearSearch}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
								>
									<XMarkIcon className="h-4 w-4" />
								</button>
							)}
						</div>

						<button
							type="button"
							onClick={handleRegisterServer}
							className="btn-primary flex items-center space-x-2 shrink-0"
						>
							<PlusIcon className="h-4 w-4" />
							<span>Register Server</span>
						</button>

						<button
							type="button"
							onClick={handleRefreshHealth}
							disabled={refreshing}
							className="btn-secondary flex items-center space-x-2 shrink-0"
						>
							<ArrowPathIcon
								className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
							/>
							<span>Refresh Health</span>
						</button>
					</div>

					{/* Results count */}
					<div className="flex items-center justify-between">
						<p className="text-sm text-gray-500 dark:text-gray-300">
							{semanticSectionVisible ? (
								<>
									Showing {semanticServers.length} servers and{" "}
									{semanticAgents.length} agents
								</>
							) : (
								<>
									Showing {filteredServers.length} servers and{" "}
									{filteredAgents.length} agents
								</>
							)}
							{activeFilter !== "all" && (
								<span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full">
									{activeFilter} filter active
								</span>
							)}
						</p>
						<p className="text-xs text-gray-400 dark:text-gray-500">
							Press Enter to run semantic search; typing filters locally.
						</p>
					</div>
				</div>

				{/* Scrollable Content Area */}
				<div className="flex-1 overflow-y-auto min-h-0 space-y-10">
					{semanticSectionVisible ? (
						<>
							<SemanticSearchResults
								query={semanticDisplayQuery}
								loading={semanticLoading}
								error={semanticError}
								servers={semanticServers}
								tools={semanticTools}
								agents={semanticAgents}
							/>

							{shouldShowFallbackGrid && (
								<div className="border-t border-gray-200 dark:border-gray-700 pt-6">
									<div className="flex items-center justify-between mb-4">
										<h4 className="text-base font-semibold text-gray-900 dark:text-gray-200">
											Keyword search fallback
										</h4>
										{semanticError && (
											<span className="text-xs font-medium text-red-500">
												Showing local matches because semantic search is
												unavailable
											</span>
										)}
									</div>
									{renderDashboardCollections()}
								</div>
							)}
						</>
					) : (
						renderDashboardCollections()
					)}
				</div>

				{/* Padding at bottom for scroll */}
				<div className="pb-12"></div>
			</div>

			{/* Register Server Modal */}
			{showRegisterModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
						<form onSubmit={handleRegisterSubmit} className="p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									Register New Server
								</h3>
								<button
									type="button"
									onClick={() => setShowRegisterModal(false)}
									className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
								>
									<XMarkIcon className="h-6 w-6" />
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="register-server-name"
										className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
									>
										Server Name *
									</label>
									<input
										id="register-server-name"
										type="text"
										required
										className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
										value={registerForm.name}
										onChange={(e) =>
											setRegisterForm((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
										placeholder="e.g., My Custom Server"
									/>
								</div>

								<div>
									<label
										htmlFor="register-server-path"
										className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
									>
										Path *
									</label>
									<input
										id="register-server-path"
										type="text"
										required
										className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
										value={registerForm.path}
										onChange={(e) =>
											setRegisterForm((prev) => ({
												...prev,
												path: e.target.value,
											}))
										}
										placeholder="/my-server"
									/>
								</div>

								<div>
									<label
										htmlFor="register-server-proxy-url"
										className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
									>
										Proxy URL *
									</label>
									<input
										id="register-server-proxy-url"
										type="url"
										required
										className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
										value={registerForm.proxyPass}
										onChange={(e) =>
											setRegisterForm((prev) => ({
												...prev,
												proxyPass: e.target.value,
											}))
										}
										placeholder="http://localhost:8080"
									/>
								</div>

								<div>
									<label
										htmlFor="register-server-description"
										className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
									>
										Description
									</label>
									<textarea
										id="register-server-description"
										className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
										rows={3}
										value={registerForm.description}
										onChange={(e) =>
											setRegisterForm((prev) => ({
												...prev,
												description: e.target.value,
											}))
										}
										placeholder="Brief description of the server"
									/>
								</div>

								<div>
									<label
										htmlFor="register-server-tags"
										className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
									>
										Tags
									</label>
									<input
										id="register-server-tags"
										type="text"
										value={registerForm.tags.join(",")}
										onChange={(e) =>
											setRegisterForm((prev) => ({
												...prev,
												tags: e.target.value
													.split(",")
													.map((t) => t.trim())
													.filter((t) => t),
											}))
										}
										className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
										placeholder="tag1,tag2,tag3"
									/>
								</div>
							</div>

							<div className="flex justify-end space-x-3 mt-6">
								<button
									type="button"
									onClick={() => setShowRegisterModal(false)}
									className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={registerLoading}
									className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-md transition-colors"
								>
									{registerLoading ? "Registering..." : "Register Server"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit Server Modal */}
			{editingServer && (
				<EditServerModal
					serverName={editingServer.name}
					form={editForm}
					loading={editLoading}
					onFormChange={(updates) =>
						setEditForm((prev) => ({ ...prev, ...updates }))
					}
					onSave={handleSaveEdit}
					onClose={handleCloseEdit}
				/>
			)}

			{/* Edit Agent Modal */}
			{editingAgent && (
				<EditAgentModal
					agentName={editingAgent.name}
					form={editAgentForm}
					loading={editAgentLoading}
					onFormChange={(updates) =>
						setEditAgentForm((prev) => ({ ...prev, ...updates }))
					}
					onSave={handleSaveEditAgent}
					onClose={handleCloseEdit}
				/>
			)}
		</>
	);
};

export default Dashboard;
