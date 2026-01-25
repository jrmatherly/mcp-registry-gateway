import { IconClipboard, IconX } from "@tabler/icons-react";
import type React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AgentLike {
	name: string;
	path: string;
	description?: string;
	version?: string;
	visibility?: string;
	trust_level?: string;
	enabled: boolean;
	tags?: string[];
}

interface AgentDetailsModalProps {
	agent: AgentLike;
	isOpen: boolean;
	onClose: () => void;
	loading: boolean;
	fullDetails?: Record<string, unknown> | null;
	onCopy?: (data: AgentLike | Record<string, unknown>) => Promise<void> | void;
}

const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({
	agent,
	isOpen,
	onClose,
	loading,
	fullDetails,
	onCopy,
}) => {
	if (!isOpen) {
		return null;
	}

	const dataToCopy = fullDetails || agent;

	const handleCopy = async () => {
		try {
			if (onCopy) {
				await onCopy(dataToCopy);
			} else {
				await navigator.clipboard.writeText(
					JSON.stringify(dataToCopy, null, 2),
				);
			}
		} catch (error) {
			console.error("Failed to copy agent JSON:", error);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="max-w-4xl max-h-[80vh] overflow-auto"
				showCloseButton={false}
			>
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle>{agent.name} - Full Details (JSON)</DialogTitle>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							aria-label="Close"
						>
							<IconX className="h-5 w-5" />
						</button>
					</div>
				</DialogHeader>

				<div className="space-y-4">
					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
						<h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
							Complete Agent Schema
						</h4>
						<p className="text-sm text-blue-800 dark:text-blue-200">
							This is the complete A2A agent definition stored in the registry.
							It includes all metadata, skills, security schemes, and
							configuration details.
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<h4 className="font-medium text-gray-900 dark:text-white">
								Agent JSON Schema:
							</h4>
							<Button
								onClick={handleCopy}
								className="flex items-center gap-2"
							>
								<IconClipboard className="h-4 w-4" />
								Copy JSON
							</Button>
						</div>

						{loading ? (
							<div className="p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-center text-gray-600 dark:text-gray-400">
								Loading full agent details...
							</div>
						) : (
							<pre className="p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg overflow-x-auto text-xs text-gray-900 dark:text-gray-100 max-h-[30vh] overflow-y-auto">
								{JSON.stringify(dataToCopy, null, 2)}
							</pre>
						)}
					</div>

					<div className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4">
						<h4 className="font-medium text-gray-900 dark:text-white mb-3">
							Field Reference
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
									Core Fields
								</h5>
								<ul className="space-y-1 text-gray-600 dark:text-gray-400">
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											protocol_version
										</code>{" "}
										- A2A protocol version
									</li>
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											name
										</code>{" "}
										- Agent display name
									</li>
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											description
										</code>{" "}
										- Agent purpose
									</li>
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											url
										</code>{" "}
										- Agent endpoint URL
									</li>
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											path
										</code>{" "}
										- Registry path
									</li>
								</ul>
							</div>
							<div>
								<h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
									Metadata Fields
								</h5>
								<ul className="space-y-1 text-gray-600 dark:text-gray-400">
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											skills
										</code>{" "}
										- Agent capabilities
									</li>
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											security_schemes
										</code>{" "}
										- Auth methods
									</li>
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											tags
										</code>{" "}
										- Categorization
									</li>
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											trust_level
										</code>{" "}
										- Verification status
									</li>
									<li>
										<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded-sm">
											metadata
										</code>{" "}
										- Custom data
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default AgentDetailsModal;
