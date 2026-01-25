import { IconX } from "@tabler/icons-react";
import type React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EditServerForm {
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

interface EditServerModalProps {
	serverName: string;
	form: EditServerForm;
	loading: boolean;
	onFormChange: (updates: Partial<EditServerForm>) => void;
	onSave: () => void;
	onClose: () => void;
}

/**
 * Modal component for editing MCP server configuration.
 */
const EditServerModal: React.FC<EditServerModalProps> = ({
	serverName,
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
				className="max-w-md max-h-[90vh] overflow-y-auto"
				showCloseButton={false}
			>
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle>Edit Server: {serverName}</DialogTitle>
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
							htmlFor="edit-server-name"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Server Name *
						</label>
						<input
							id="edit-server-name"
							type="text"
							value={form.name}
							onChange={(e) => onFormChange({ name: e.target.value })}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 hover:border-primary-500/30 transition-all duration-200"
							required
						/>
					</div>

					<div>
						<label
							htmlFor="edit-server-proxy-pass"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Proxy Pass URL *
						</label>
						<input
							id="edit-server-proxy-pass"
							type="url"
							value={form.proxyPass}
							onChange={(e) => onFormChange({ proxyPass: e.target.value })}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 hover:border-primary-500/30 transition-all duration-200"
							placeholder="http://localhost:8080"
							required
						/>
					</div>

					<div>
						<label
							htmlFor="edit-server-description"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Description
						</label>
						<textarea
							id="edit-server-description"
							value={form.description}
							onChange={(e) => onFormChange({ description: e.target.value })}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 hover:border-primary-500/30 transition-all duration-200"
							rows={3}
							placeholder="Brief description of the server"
						/>
					</div>

					<div>
						<label
							htmlFor="edit-server-tags"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Tags
						</label>
						<input
							id="edit-server-tags"
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
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 hover:border-primary-500/30 transition-all duration-200"
							placeholder="tag1,tag2,tag3"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="edit-server-num-tools"
								className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
							>
								Number of Tools
							</label>
							<input
								id="edit-server-num-tools"
								type="number"
								value={form.num_tools}
								onChange={(e) =>
									onFormChange({ num_tools: parseInt(e.target.value, 10) || 0 })
								}
								className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 hover:border-primary-500/30 transition-all duration-200"
								min="0"
							/>
						</div>

						<div>
							<label
								htmlFor="edit-server-num-stars"
								className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
							>
								Stars
							</label>
							<input
								id="edit-server-num-stars"
								type="number"
								value={form.num_stars}
								onChange={(e) =>
									onFormChange({ num_stars: parseInt(e.target.value, 10) || 0 })
								}
								className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 hover:border-primary-500/30 transition-all duration-200"
								min="0"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="edit-server-license"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							License
						</label>
						<input
							id="edit-server-license"
							type="text"
							value={form.license}
							onChange={(e) => onFormChange({ license: e.target.value })}
							className="block w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 hover:border-primary-500/30 transition-all duration-200"
							placeholder="MIT, Apache-2.0, etc."
						/>
					</div>

					<div className="flex items-center">
						<input
							type="checkbox"
							id="is_python"
							checked={form.is_python}
							onChange={(e) => onFormChange({ is_python: e.target.checked })}
							className="h-4 w-4 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 border-gray-300 dark:border-white/20 rounded-sm bg-white dark:bg-white/5"
						/>
						<label
							htmlFor="is_python"
							className="ml-2 block text-sm text-gray-700 dark:text-gray-200"
						>
							Python-based server
						</label>
					</div>

					<div>
						<label
							htmlFor="edit-server-path"
							className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>
							Path (read-only)
						</label>
						<input
							id="edit-server-path"
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
							className="flex-1"
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

EditServerModal.displayName = "EditServerModal";

export default EditServerModal;
export type { EditServerForm };
