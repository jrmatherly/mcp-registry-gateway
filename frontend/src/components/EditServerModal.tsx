import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Server: {serverName}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Server Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Proxy Pass URL *
            </label>
            <input
              type="url"
              value={form.proxyPass}
              onChange={(e) => onFormChange({ proxyPass: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
              placeholder="http://localhost:8080"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
              rows={3}
              placeholder="Brief description of the server"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={form.tags.join(',')}
              onChange={(e) =>
                onFormChange({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t),
                })
              }
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
              placeholder="tag1,tag2,tag3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Number of Tools
              </label>
              <input
                type="number"
                value={form.num_tools}
                onChange={(e) =>
                  onFormChange({ num_tools: parseInt(e.target.value) || 0 })
                }
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Stars
              </label>
              <input
                type="number"
                value={form.num_stars}
                onChange={(e) =>
                  onFormChange({ num_stars: parseInt(e.target.value) || 0 })
                }
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              License
            </label>
            <input
              type="text"
              value={form.license}
              onChange={(e) => onFormChange({ license: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500"
              placeholder="MIT, Apache-2.0, etc."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_python"
              checked={form.is_python}
              onChange={(e) => onFormChange({ is_python: e.target.checked })}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label
              htmlFor="is_python"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-200"
            >
              Python-based server
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Path (read-only)
            </label>
            <input
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
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-md transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
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

EditServerModal.displayName = 'EditServerModal';

export default EditServerModal;
export type { EditServerForm };
