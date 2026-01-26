import {
	IconClipboard,
	IconX,
	IconCode,
	IconInfoCircle,
	IconAlertTriangle,
	IconCheck,
} from "@tabler/icons-react";
import type React from "react";
import { useCallback, useState } from "react";
import type { Server } from "./ServerCard";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type IDE = "vscode" | "cursor" | "cline" | "claude-code";

interface ServerConfigModalProps {
	server: Server;
	isOpen: boolean;
	onClose: () => void;
	onShowToast?: (message: string, type: "success" | "error") => void;
}

/**
 * Section header component for grouping modal content
 */
const ConfigSection: React.FC<{
	title: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
}> = ({ title, icon, children }) => (
	<div className="space-y-3">
		<h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
			{icon}
			{title}
		</h3>
		<div>{children}</div>
	</div>
);

const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
	server,
	isOpen,
	onClose,
	onShowToast,
}) => {
	const [selectedIDE, setSelectedIDE] = useState<IDE>("vscode");
	const [copied, setCopied] = useState(false);

	const generateMCPConfig = useCallback(() => {
		const serverName = server.name
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9-]/g, "");

		// Get base URL and strip port for nginx proxy compatibility
		const currentUrl = new URL(window.location.origin);
		const baseUrl = `${currentUrl.protocol}//${currentUrl.hostname}`;

		// Clean up server path - remove trailing slashes and ensure single leading slash
		const cleanPath = server.path.replace(/\/+$/, "").replace(/^\/+/, "/");
		const url = `${baseUrl}${cleanPath}/mcp`;

		switch (selectedIDE) {
			case "vscode":
				return {
					servers: {
						[serverName]: {
							type: "http",
							url,
							headers: {
								Authorization: "Bearer [YOUR_AUTH_TOKEN]",
							},
						},
					},
					inputs: [
						{
							type: "promptString",
							id: "auth-token",
							description: "Gateway Authentication Token",
						},
					],
				};
			case "cursor":
				return {
					mcpServers: {
						[serverName]: {
							url,
							headers: {
								Authorization: "Bearer [YOUR_AUTH_TOKEN]",
							},
						},
					},
				};
			case "cline":
				return {
					mcpServers: {
						[serverName]: {
							type: "streamableHttp",
							url,
							disabled: false,
							headers: {
								Authorization: "Bearer [YOUR_AUTH_TOKEN]",
							},
						},
					},
				};
			case "claude-code":
				return {
					mcpServers: {
						[serverName]: {
							type: "http",
							url,
							headers: {
								Authorization: "Bearer [YOUR_AUTH_TOKEN]",
							},
						},
					},
				};
			default:
				return {
					mcpServers: {
						[serverName]: {
							type: "http",
							url,
							headers: {
								Authorization: "Bearer [YOUR_AUTH_TOKEN]",
							},
						},
					},
				};
		}
	}, [server.name, server.path, selectedIDE]);

	const copyConfigToClipboard = useCallback(async () => {
		try {
			const config = generateMCPConfig();
			const configText = JSON.stringify(config, null, 2);
			await navigator.clipboard.writeText(configText);

			setCopied(true);
			onShowToast?.("Configuration copied to clipboard!", "success");
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy to clipboard:", error);
			onShowToast?.("Failed to copy configuration", "error");
		}
	}, [generateMCPConfig, onShowToast]);

	if (!isOpen) {
		return null;
	}

	const ideLabels: Record<IDE, string> = {
		vscode: "VS Code",
		cursor: "Cursor",
		cline: "Cline",
		"claude-code": "Claude Code",
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="max-w-3xl max-h-[85vh] overflow-auto"
				showCloseButton={false}
			>
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle>MCP Configuration for {server.name}</DialogTitle>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
							aria-label="Close modal"
						>
							<IconX className="h-5 w-5" />
						</button>
					</div>
				</DialogHeader>

				<div className="space-y-6">
					{/* Setup Instructions */}
					<ConfigSection
						title="Setup Instructions"
						icon={<IconInfoCircle className="h-4 w-4" />}
					>
						<div className="bg-linear-to-br from-primary-500/10 to-indigo-500/10 dark:from-primary-900/30 dark:to-indigo-900/20 border border-primary-200 dark:border-primary-500/30 rounded-xl p-4">
							<ol className="text-sm text-gray-700 dark:text-gray-200 space-y-2 list-decimal list-inside">
								<li>Copy the configuration below</li>
								<li>
									Paste it into your{" "}
									<code className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-md text-xs font-mono">
										mcp.json
									</code>{" "}
									file
								</li>
								<li>
									Replace{" "}
									<code className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-md text-xs font-mono">
										[YOUR_AUTH_TOKEN]
									</code>{" "}
									with your gateway authentication token
								</li>
								<li>
									Replace{" "}
									<code className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-md text-xs font-mono">
										[YOUR_CLIENT_ID]
									</code>{" "}
									with your client ID
								</li>
								<li>
									Restart your AI coding assistant to load the new configuration
								</li>
							</ol>
						</div>
					</ConfigSection>

					{/* Authentication Warning */}
					<div className="bg-linear-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-900/30 dark:to-orange-900/20 border border-amber-300 dark:border-amber-500/30 rounded-xl p-4">
						<div className="flex items-start gap-3">
							<IconAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
							<div>
								<h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
									Authentication Required
								</h4>
								<p className="text-sm text-amber-800 dark:text-amber-200">
									This configuration requires gateway authentication tokens. The
									tokens authenticate your AI assistant with the MCP Gateway,
									not the individual server. Visit the authentication
									documentation for setup instructions.
								</p>
							</div>
						</div>
					</div>

					{/* IDE Selector */}
					<ConfigSection
						title="Select Your IDE / Tool"
						icon={<IconCode className="h-4 w-4" />}
					>
						<div className="bg-gray-50 dark:bg-white/3 rounded-xl p-4 border border-gray-200 dark:border-white/5">
							<div className="flex flex-wrap gap-2">
								{(
									["vscode", "cursor", "cline", "claude-code"] as IDE[]
								).map((ide) => (
									<Button
										key={ide}
										variant={selectedIDE === ide ? "default" : "outline"}
										size="sm"
										onClick={() => setSelectedIDE(ide)}
										className={
											selectedIDE === ide
												? "bg-primary-600 hover:bg-primary-700 text-white"
												: ""
										}
									>
										{ideLabels[ide]}
									</Button>
								))}
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
								Configuration format optimized for{" "}
								<span className="font-medium text-gray-700 dark:text-gray-300">
									{ideLabels[selectedIDE]}
								</span>{" "}
								integration
							</p>
						</div>
					</ConfigSection>

					{/* Configuration JSON */}
					<ConfigSection title="Configuration JSON">
						<div className="space-y-3">
							<div className="flex items-center justify-end">
								<Button
									onClick={copyConfigToClipboard}
									className={`flex items-center gap-2 transition-all ${
										copied
											? "bg-green-600 hover:bg-green-700"
											: "bg-primary-600 hover:bg-primary-700"
									}`}
								>
									{copied ? (
										<>
											<IconCheck className="h-4 w-4" />
											Copied!
										</>
									) : (
										<>
											<IconClipboard className="h-4 w-4" />
											Copy to Clipboard
										</>
									)}
								</Button>
							</div>
							<div className="relative rounded-xl overflow-hidden border border-gray-700 dark:border-white/10">
								<div className="bg-gray-800 dark:bg-gray-900/80 text-gray-300 px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-gray-700 dark:border-white/10">
									<span>mcp.json</span>
									<span className="text-gray-500">JSON</span>
								</div>
								<pre className="bg-gray-900 dark:bg-[#0d1117] text-gray-100 p-4 text-sm overflow-x-auto font-mono leading-relaxed">
									<code>{JSON.stringify(generateMCPConfig(), null, 2)}</code>
								</pre>
							</div>
						</div>
					</ConfigSection>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ServerConfigModal;
