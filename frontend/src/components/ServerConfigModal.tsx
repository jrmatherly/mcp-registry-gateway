import { IconClipboard, IconX } from "@tabler/icons-react";
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

const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
	server,
	isOpen,
	onClose,
	onShowToast,
}) => {
	const [selectedIDE, setSelectedIDE] = useState<IDE>("vscode");

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

			onShowToast?.("Configuration copied to clipboard!", "success");
		} catch (error) {
			console.error("Failed to copy to clipboard:", error);
			onShowToast?.("Failed to copy configuration", "error");
		}
	}, [generateMCPConfig, onShowToast]);

	if (!isOpen) {
		return null;
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="max-w-3xl max-h-[80vh] overflow-auto"
				showCloseButton={false}
			>
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle>MCP Configuration for {server.name}</DialogTitle>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						>
							<IconX className="h-5 w-5" />
						</button>
					</div>
				</DialogHeader>

				<div className="space-y-4">
					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
						<h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
							How to use this configuration:
						</h4>
						<ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
							<li>Copy the configuration below</li>
							<li>
								Paste it into your{" "}
								<code className="bg-blue-100 dark:bg-blue-800 px-1 rounded-sm">
									mcp.json
								</code>{" "}
								file
							</li>
							<li>
								Replace{" "}
								<code className="bg-blue-100 dark:bg-blue-800 px-1 rounded-sm">
									[YOUR_AUTH_TOKEN]
								</code>{" "}
								with your gateway authentication token
							</li>
							<li>
								Replace{" "}
								<code className="bg-blue-100 dark:bg-blue-800 px-1 rounded-sm">
									[YOUR_CLIENT_ID]
								</code>{" "}
								with your client ID
							</li>
							<li>
								Restart your AI coding assistant to load the new configuration
							</li>
						</ol>
					</div>

					<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
						<h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
							Authentication Required
						</h4>
						<p className="text-sm text-amber-800 dark:text-amber-200">
							This configuration requires gateway authentication tokens. The
							tokens authenticate your AI assistant with the MCP Gateway, not
							the individual server. Visit the authentication documentation for
							setup instructions.
						</p>
					</div>

					<div className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4">
						<h4 className="font-medium text-gray-900 dark:text-white mb-3">
							Select your IDE/Tool:
						</h4>
						<div className="flex flex-wrap gap-2">
							{(["vscode", "cursor", "cline", "claude-code"] as IDE[]).map(
								(ide) => (
									<Button
										key={ide}
										variant={selectedIDE === ide ? "default" : "outline"}
										size="sm"
										onClick={() => setSelectedIDE(ide)}
									>
										{ide === "vscode"
											? "VS Code"
											: ide === "cursor"
												? "Cursor"
												: ide === "cline"
													? "Cline"
													: "Claude Code"}
									</Button>
								),
							)}
						</div>
						<p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
							Configuration format optimized for{" "}
							{selectedIDE === "vscode"
								? "VS Code"
								: selectedIDE === "cursor"
									? "Cursor"
									: selectedIDE === "cline"
										? "Cline"
										: "Claude Code"}{" "}
							integration
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<h4 className="font-medium text-gray-900 dark:text-white">
								Configuration JSON:
							</h4>
							<Button
								onClick={copyConfigToClipboard}
								className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
							>
								<IconClipboard className="h-4 w-4" />
								Copy to Clipboard
							</Button>
						</div>
						<pre className="bg-gray-900 text-green-100 p-4 rounded-lg text-sm overflow-x-auto">
							{JSON.stringify(generateMCPConfig(), null, 2)}
						</pre>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ServerConfigModal;
