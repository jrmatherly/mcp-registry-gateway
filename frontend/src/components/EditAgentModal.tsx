import { IconX } from "@tabler/icons-react";
import type React from "react";
import type { TrustLevel, Visibility } from "../types";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EditAgentForm {
	name: string;
	path: string;
	description: string;
	version: string;
	visibility: Visibility;
	trust_level: TrustLevel;
	tags: string[];
}

interface EditAgentModalProps {
	agentName: string;
	form: EditAgentForm;
	loading: boolean;
	onFormChange: (updates: Partial<EditAgentForm>) => void;
	onSave: () => void;
	onClose: () => void;
}

/**
 * Modal component for editing A2A agent configuration.
 */
const EditAgentModal: React.FC<EditAgentModalProps> = ({
	agentName,
	form,
	loading,
	onFormChange,
	onSave,
	onClose,
}) => {
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSave();
	};

	return (
		<Dialog open={true} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="max-w-4xl max-h-[90vh] overflow-y-auto"
				showCloseButton={false}
			>
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle>Edit Agent: {agentName}</DialogTitle>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							aria-label="Close modal"
						>
							<IconX className="h-6 w-6" />
						</button>
					</div>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="edit-agent-name"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Agent Name *
						</label>
						<input
							id="edit-agent-name"
							type="text"
							value={form.name}
							onChange={(e) => onFormChange({ name: e.target.value })}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 hover:border-cyan-500/30 transition-all duration-200"
							required
						/>
					</div>

					<div>
						<label
							htmlFor="edit-agent-description"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Description
						</label>
						<textarea
							id="edit-agent-description"
							value={form.description}
							onChange={(e) => onFormChange({ description: e.target.value })}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 hover:border-cyan-500/30 transition-all duration-200"
							rows={3}
							placeholder="Brief description of the agent"
						/>
					</div>

					<div>
						<label
							htmlFor="edit-agent-version"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Version
						</label>
						<input
							id="edit-agent-version"
							type="text"
							value={form.version}
							onChange={(e) => onFormChange({ version: e.target.value })}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 hover:border-cyan-500/30 transition-all duration-200"
							placeholder="1.0.0"
						/>
					</div>

					<div>
						<label
							htmlFor="edit-agent-visibility"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Visibility
						</label>
						<select
							id="edit-agent-visibility"
							value={form.visibility}
							onChange={(e) =>
								onFormChange({ visibility: e.target.value as Visibility })
							}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 hover:border-cyan-500/30 transition-all duration-200"
						>
							<option value="private">Private</option>
							<option value="public">Public</option>
							<option value="group-restricted">Group Restricted</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="edit-agent-trust-level"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Trust Level
						</label>
						<select
							id="edit-agent-trust-level"
							value={form.trust_level}
							onChange={(e) =>
								onFormChange({ trust_level: e.target.value as TrustLevel })
							}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 hover:border-cyan-500/30 transition-all duration-200"
						>
							<option value="unverified">Unverified</option>
							<option value="community">Community</option>
							<option value="verified">Verified</option>
							<option value="trusted">Trusted</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="edit-agent-tags"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Tags
						</label>
						<input
							id="edit-agent-tags"
							type="text"
							value={form.tags.join(",")}
							onChange={(e) =>
								onFormChange({
									tags: e.target.value
										.split(",")
										.map((t) => t.trim())
										.filter((t) => t),
								})
							}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 hover:border-cyan-500/30 transition-all duration-200"
							placeholder="tag1,tag2,tag3"
						/>
					</div>

					<div>
						<label
							htmlFor="edit-agent-path"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Path (read-only)
						</label>
						<input
							id="edit-agent-path"
							type="text"
							value={form.path}
							className="block w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/3 border border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 cursor-not-allowed"
							disabled
						/>
					</div>

					<div className="flex space-x-3 pt-4">
						<Button
							type="submit"
							disabled={loading}
							className="flex-1 bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
						>
							{loading ? "Saving..." : "Save Changes"}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							className="flex-1"
						>
							Cancel
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
};

EditAgentModal.displayName = "EditAgentModal";

export default EditAgentModal;
export type { EditAgentForm };
