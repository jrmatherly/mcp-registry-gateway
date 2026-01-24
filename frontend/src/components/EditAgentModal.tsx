import { XMarkIcon } from "@heroicons/react/24/outline";
import type React from "react";
import type { TrustLevel, Visibility } from "../types";

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-white/10 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Agent: {agentName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

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
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-cyan-500 focus:border-cyan-500"
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
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-cyan-500 focus:border-cyan-500"
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
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-cyan-500 focus:border-cyan-500"
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
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-cyan-500 focus:border-cyan-500"
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
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-cyan-500 focus:border-cyan-500"
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
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-cyan-500 focus:border-cyan-500"
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
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300"
              disabled
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded-md transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditAgentModal.displayName = "EditAgentModal";

export default EditAgentModal;
export type { EditAgentForm };
