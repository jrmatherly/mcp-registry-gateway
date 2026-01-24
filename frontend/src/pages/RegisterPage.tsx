import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import type React from "react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import Toast from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";

type RegistrationType = "server" | "agent";
type RegistrationMode = "form" | "json";

interface ServerFormData {
  name: string;
  description: string;
  path: string;
  proxy_pass_url: string;
  tags: string;
  num_tools: number;
  license: string;
  is_python: boolean;
  visibility: string;
  author: string;
  homepage: string;
  repository_url: string;
}

interface AgentFormData {
  name: string;
  description: string;
  url: string;
  path: string;
  protocol_version: string;
  version: string;
  tags: string;
  capabilities: string;
  license: string;
  visibility: string;
  author: string;
  homepage: string;
  repository_url: string;
  streaming: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const initialServerForm: ServerFormData = {
  name: "",
  description: "",
  path: "",
  proxy_pass_url: "",
  tags: "",
  num_tools: 0,
  license: "MIT",
  is_python: false,
  visibility: "public",
  author: "",
  homepage: "",
  repository_url: "",
};

const initialAgentForm: AgentFormData = {
  name: "",
  description: "",
  url: "",
  path: "",
  protocol_version: "1.0",
  version: "1.0.0",
  tags: "",
  capabilities: "",
  license: "MIT",
  visibility: "public",
  author: "",
  homepage: "",
  repository_url: "",
  streaming: false,
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registrationType, setRegistrationType] =
    useState<RegistrationType>("server");
  const [registrationMode, setRegistrationMode] =
    useState<RegistrationMode>("form");
  const [serverForm, setServerForm] =
    useState<ServerFormData>(initialServerForm);
  const [agentForm, setAgentForm] = useState<AgentFormData>(initialAgentForm);
  const [jsonContent, setJsonContent] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const generatePath = useCallback((name: string): string => {
    if (!name) return "";
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `/${slug}`;
  }, []);

  const handleServerNameChange = useCallback(
    (name: string) => {
      setServerForm((prev) => ({
        ...prev,
        name,
        path: prev.path || generatePath(name),
      }));
    },
    [generatePath],
  );

  const handleAgentNameChange = useCallback(
    (name: string) => {
      setAgentForm((prev) => ({
        ...prev,
        name,
        path: prev.path || generatePath(name),
      }));
    },
    [generatePath],
  );

  const validateServerForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!serverForm.name.trim()) {
      newErrors.name = "Server name is required";
    }

    if (!serverForm.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!serverForm.path.trim()) {
      newErrors.path = "Path is required";
    } else if (!serverForm.path.startsWith("/")) {
      newErrors.path = "Path must start with /";
    }

    if (!serverForm.proxy_pass_url.trim()) {
      newErrors.proxy_pass_url = "Proxy URL is required";
    } else {
      try {
        new URL(serverForm.proxy_pass_url);
      } catch {
        newErrors.proxy_pass_url = "Invalid URL format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [serverForm]);

  const validateAgentForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!agentForm.name.trim()) {
      newErrors.name = "Agent name is required";
    }

    if (!agentForm.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!agentForm.url.trim()) {
      newErrors.url = "Agent URL is required";
    } else {
      try {
        const url = new URL(agentForm.url);
        if (!["http:", "https:"].includes(url.protocol)) {
          newErrors.url = "URL must use HTTP or HTTPS protocol";
        }
      } catch {
        newErrors.url = "Invalid URL format";
      }
    }

    if (agentForm.path && !agentForm.path.startsWith("/")) {
      newErrors.path = "Path must start with /";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [agentForm]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          setJsonContent(JSON.stringify(parsed, null, 2));

          // Auto-populate form fields from JSON
          if (registrationType === "server") {
            setServerForm((prev) => ({
              ...prev,
              name: parsed.server_name || parsed.name || prev.name,
              description: parsed.description || prev.description,
              path: parsed.path || prev.path,
              proxy_pass_url:
                parsed.proxy_pass_url ||
                parsed.proxyPassUrl ||
                prev.proxy_pass_url,
              tags: Array.isArray(parsed.tags)
                ? parsed.tags.join(",")
                : parsed.tags || prev.tags,
              num_tools: parsed.num_tools || parsed.numTools || prev.num_tools,
              license: parsed.license || prev.license,
              is_python: parsed.is_python || parsed.isPython || prev.is_python,
              visibility: parsed.visibility || prev.visibility,
              author: parsed.author || prev.author,
              homepage: parsed.homepage || prev.homepage,
              repository_url:
                parsed.repository_url ||
                parsed.repositoryUrl ||
                prev.repository_url,
            }));
          } else {
            setAgentForm((prev) => ({
              ...prev,
              name: parsed.name || prev.name,
              description: parsed.description || prev.description,
              url: parsed.url || prev.url,
              path: parsed.path || prev.path,
              protocol_version:
                parsed.protocol_version ||
                parsed.protocolVersion ||
                prev.protocol_version,
              version: parsed.version || prev.version,
              tags: Array.isArray(parsed.tags)
                ? parsed.tags.join(",")
                : parsed.tags || prev.tags,
              capabilities: parsed.capabilities
                ? JSON.stringify(parsed.capabilities)
                : prev.capabilities,
              license: parsed.license || prev.license,
              visibility: parsed.visibility || prev.visibility,
              author:
                parsed.author || parsed.provider?.organization || prev.author,
              homepage:
                parsed.homepage || parsed.provider?.url || prev.homepage,
              repository_url:
                parsed.repository_url ||
                parsed.repositoryUrl ||
                prev.repository_url,
              streaming:
                parsed.streaming ||
                parsed.capabilities?.streaming ||
                prev.streaming,
            }));
          }

          setToast({
            message: "JSON file loaded successfully",
            type: "success",
          });
        } catch {
          setToast({ message: "Invalid JSON file", type: "error" });
        }
      };
      reader.readAsText(file);
    },
    [registrationType],
  );

  const handleServerSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      if (!validateServerForm()) return;

      setLoading(true);

      try {
        const formData = new FormData();
        formData.append("name", serverForm.name);
        formData.append("description", serverForm.description);
        formData.append("path", serverForm.path);
        formData.append("proxy_pass_url", serverForm.proxy_pass_url);
        formData.append("tags", serverForm.tags);
        formData.append("num_tools", serverForm.num_tools.toString());
        formData.append("license", serverForm.license);
        formData.append("is_python", serverForm.is_python.toString());

        await axios.post("/api/register", formData, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        setToast({
          message: "Server registered successfully!",
          type: "success",
        });
        setTimeout(() => navigate("/"), 1500);
      } catch (error: unknown) {
        const axiosError = error as {
          response?: {
            data?: { detail?: string; error?: string; reason?: string };
          };
        };
        const message =
          axiosError.response?.data?.error ||
          axiosError.response?.data?.reason ||
          axiosError.response?.data?.detail ||
          "Failed to register server";
        setToast({ message, type: "error" });
      } finally {
        setLoading(false);
      }
    },
    [loading, serverForm, validateServerForm, navigate],
  );

  const handleAgentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      if (!validateAgentForm()) return;

      setLoading(true);

      try {
        const payload = {
          name: agentForm.name,
          description: agentForm.description,
          url: agentForm.url,
          path: agentForm.path || undefined,
          protocolVersion: agentForm.protocol_version,
          version: agentForm.version,
          tags: agentForm.tags,
          license: agentForm.license,
          visibility: agentForm.visibility,
          streaming: agentForm.streaming,
          provider: agentForm.author
            ? {
                organization: agentForm.author,
                url: agentForm.homepage || agentForm.url,
              }
            : undefined,
        };

        await axios.post("/api/agents/register", payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        setToast({
          message: "Agent registered successfully!",
          type: "success",
        });
        setTimeout(() => navigate("/"), 1500);
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { detail?: string | { message?: string } } };
        };
        let message = "Failed to register agent";
        if (axiosError.response?.data?.detail) {
          if (typeof axiosError.response.data.detail === "string") {
            message = axiosError.response.data.detail;
          } else if (axiosError.response.data.detail.message) {
            message = axiosError.response.data.detail.message;
          }
        }
        setToast({ message, type: "error" });
      } finally {
        setLoading(false);
      }
    },
    [loading, agentForm, validateAgentForm, navigate],
  );

  const inputClass =
    "block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500";
  const labelClass =
    "block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1";
  const errorClass = "mt-1 text-sm text-red-500 dark:text-red-400";

  const renderServerForm = () => (
    <form onSubmit={handleServerSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Required Fields */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-1 rounded-sm text-xs mr-2">
              Required
            </span>
            Basic Information
          </h3>
        </div>

        <div>
          <label htmlFor="server-name" className={labelClass}>Server Name *</label>
          <input
            id="server-name"
            type="text"
            required
            className={`${inputClass} ${errors.name ? "border-red-500" : ""}`}
            value={serverForm.name}
            onChange={(e) => handleServerNameChange(e.target.value)}
            placeholder="e.g., My Custom Server"
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="server-path" className={labelClass}>Path *</label>
          <input
            id="server-path"
            type="text"
            required
            className={`${inputClass} ${errors.path ? "border-red-500" : ""}`}
            value={serverForm.path}
            onChange={(e) =>
              setServerForm((prev) => ({ ...prev, path: e.target.value }))
            }
            placeholder="/my-server"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Auto-generated from name, but can be customized
          </p>
          {errors.path && <p className={errorClass}>{errors.path}</p>}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="server-proxy-url" className={labelClass}>Proxy URL *</label>
          <input
            id="server-proxy-url"
            type="url"
            required
            className={`${inputClass} ${errors.proxy_pass_url ? "border-red-500" : ""}`}
            value={serverForm.proxy_pass_url}
            onChange={(e) =>
              setServerForm((prev) => ({
                ...prev,
                proxy_pass_url: e.target.value,
              }))
            }
            placeholder="http://localhost:8080"
          />
          {errors.proxy_pass_url && (
            <p className={errorClass}>{errors.proxy_pass_url}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="server-description" className={labelClass}>Description *</label>
          <textarea
            id="server-description"
            required
            className={`${inputClass} ${errors.description ? "border-red-500" : ""}`}
            rows={3}
            value={serverForm.description}
            onChange={(e) =>
              setServerForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Brief description of the server and its capabilities"
          />
          {errors.description && (
            <p className={errorClass}>{errors.description}</p>
          )}
        </div>

        {/* Optional Fields */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-sm text-xs mr-2">
              Optional
            </span>
            Additional Settings
          </h3>
        </div>

        <div>
          <label htmlFor="server-tags" className={labelClass}>Tags</label>
          <input
            id="server-tags"
            type="text"
            className={inputClass}
            value={serverForm.tags}
            onChange={(e) =>
              setServerForm((prev) => ({ ...prev, tags: e.target.value }))
            }
            placeholder="tag1, tag2, tag3"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Comma-separated list
          </p>
        </div>

        <div>
          <label htmlFor="server-num-tools" className={labelClass}>Number of Tools</label>
          <input
            id="server-num-tools"
            type="number"
            min="0"
            className={inputClass}
            value={serverForm.num_tools}
            onChange={(e) =>
              setServerForm((prev) => ({
                ...prev,
                num_tools: parseInt(e.target.value, 10) || 0,
              }))
            }
          />
        </div>

        <div>
          <label htmlFor="server-license" className={labelClass}>License</label>
          <select
            id="server-license"
            className={inputClass}
            value={serverForm.license}
            onChange={(e) =>
              setServerForm((prev) => ({ ...prev, license: e.target.value }))
            }
          >
            <option value="MIT">MIT</option>
            <option value="Apache-2.0">Apache 2.0</option>
            <option value="GPL-3.0">GPL 3.0</option>
            <option value="BSD-3-Clause">BSD 3-Clause</option>
            <option value="N/A">N/A</option>
          </select>
        </div>

        <div>
          <label htmlFor="server-visibility" className={labelClass}>Visibility</label>
          <select
            id="server-visibility"
            className={inputClass}
            value={serverForm.visibility}
            onChange={(e) =>
              setServerForm((prev) => ({ ...prev, visibility: e.target.value }))
            }
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="group-restricted">Group Restricted</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded-sm"
              checked={serverForm.is_python}
              onChange={(e) =>
                setServerForm((prev) => ({
                  ...prev,
                  is_python: e.target.checked,
                }))
              }
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
              Python-based server
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="server-author" className={labelClass}>Author</label>
          <input
            id="server-author"
            type="text"
            className={inputClass}
            value={serverForm.author}
            onChange={(e) =>
              setServerForm((prev) => ({ ...prev, author: e.target.value }))
            }
            placeholder="Your name or organization"
          />
        </div>

        <div>
          <label htmlFor="server-homepage" className={labelClass}>Homepage</label>
          <input
            id="server-homepage"
            type="url"
            className={inputClass}
            value={serverForm.homepage}
            onChange={(e) =>
              setServerForm((prev) => ({ ...prev, homepage: e.target.value }))
            }
            placeholder="https://example.com"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="server-repository-url" className={labelClass}>Repository URL</label>
          <input
            id="server-repository-url"
            type="url"
            className={inputClass}
            value={serverForm.repository_url}
            onChange={(e) =>
              setServerForm((prev) => ({
                ...prev,
                repository_url: e.target.value,
              }))
            }
            placeholder="https://github.com/username/repo"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          {loading ? "Registering..." : "Register Server"}
        </button>
      </div>
    </form>
  );

  const renderAgentForm = () => (
    <form onSubmit={handleAgentSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Required Fields */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-1 rounded-sm text-xs mr-2">
              Required
            </span>
            Basic Information
          </h3>
        </div>

        <div>
          <label htmlFor="agent-name" className={labelClass}>Agent Name *</label>
          <input
            id="agent-name"
            type="text"
            required
            className={`${inputClass} ${errors.name ? "border-red-500" : ""}`}
            value={agentForm.name}
            onChange={(e) => handleAgentNameChange(e.target.value)}
            placeholder="e.g., My AI Agent"
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="agent-path" className={labelClass}>Path (auto-generated)</label>
          <input
            id="agent-path"
            type="text"
            className={`${inputClass} ${errors.path ? "border-red-500" : ""}`}
            value={agentForm.path}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, path: e.target.value }))
            }
            placeholder="/my-agent"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave empty to auto-generate from name
          </p>
          {errors.path && <p className={errorClass}>{errors.path}</p>}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="agent-url" className={labelClass}>Agent URL *</label>
          <input
            id="agent-url"
            type="url"
            required
            className={`${inputClass} ${errors.url ? "border-red-500" : ""}`}
            value={agentForm.url}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, url: e.target.value }))
            }
            placeholder="https://my-agent.example.com"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The endpoint URL where the agent can be reached
          </p>
          {errors.url && <p className={errorClass}>{errors.url}</p>}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="agent-description" className={labelClass}>Description *</label>
          <textarea
            id="agent-description"
            required
            className={`${inputClass} ${errors.description ? "border-red-500" : ""}`}
            rows={3}
            value={agentForm.description}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Describe what your agent does and its capabilities"
          />
          {errors.description && (
            <p className={errorClass}>{errors.description}</p>
          )}
        </div>

        {/* Optional Fields */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-sm text-xs mr-2">
              Optional
            </span>
            Additional Settings
          </h3>
        </div>

        <div>
          <label htmlFor="agent-protocol-version" className={labelClass}>Protocol Version</label>
          <input
            id="agent-protocol-version"
            type="text"
            className={inputClass}
            value={agentForm.protocol_version}
            onChange={(e) =>
              setAgentForm((prev) => ({
                ...prev,
                protocol_version: e.target.value,
              }))
            }
            placeholder="1.0"
          />
        </div>

        <div>
          <label htmlFor="agent-version" className={labelClass}>Agent Version</label>
          <input
            id="agent-version"
            type="text"
            className={inputClass}
            value={agentForm.version}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, version: e.target.value }))
            }
            placeholder="1.0.0"
          />
        </div>

        <div>
          <label htmlFor="agent-tags" className={labelClass}>Tags</label>
          <input
            id="agent-tags"
            type="text"
            className={inputClass}
            value={agentForm.tags}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, tags: e.target.value }))
            }
            placeholder="ai, assistant, nlp"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Comma-separated list
          </p>
        </div>

        <div>
          <label htmlFor="agent-license" className={labelClass}>License</label>
          <select
            id="agent-license"
            className={inputClass}
            value={agentForm.license}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, license: e.target.value }))
            }
          >
            <option value="MIT">MIT</option>
            <option value="Apache-2.0">Apache 2.0</option>
            <option value="GPL-3.0">GPL 3.0</option>
            <option value="BSD-3-Clause">BSD 3-Clause</option>
            <option value="N/A">N/A</option>
          </select>
        </div>

        <div>
          <label htmlFor="agent-visibility" className={labelClass}>Visibility</label>
          <select
            id="agent-visibility"
            className={inputClass}
            value={agentForm.visibility}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, visibility: e.target.value }))
            }
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="group-restricted">Group Restricted</option>
          </select>
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded-sm"
              checked={agentForm.streaming}
              onChange={(e) =>
                setAgentForm((prev) => ({
                  ...prev,
                  streaming: e.target.checked,
                }))
              }
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
              Supports streaming responses
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="agent-author" className={labelClass}>Author / Organization</label>
          <input
            id="agent-author"
            type="text"
            className={inputClass}
            value={agentForm.author}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, author: e.target.value }))
            }
            placeholder="Your name or organization"
          />
        </div>

        <div>
          <label htmlFor="agent-homepage" className={labelClass}>Homepage</label>
          <input
            id="agent-homepage"
            type="url"
            className={inputClass}
            value={agentForm.homepage}
            onChange={(e) =>
              setAgentForm((prev) => ({ ...prev, homepage: e.target.value }))
            }
            placeholder="https://example.com"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="agent-repository-url" className={labelClass}>Repository URL</label>
          <input
            id="agent-repository-url"
            type="url"
            className={inputClass}
            value={agentForm.repository_url}
            onChange={(e) =>
              setAgentForm((prev) => ({
                ...prev,
                repository_url: e.target.value,
              }))
            }
            placeholder="https://github.com/username/repo"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          {loading ? "Registering..." : "Register Agent"}
        </button>
      </div>
    </form>
  );

  const renderJsonUpload = () => (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor="json-upload" className="cursor-pointer">
            <span className="text-purple-600 dark:text-purple-400 hover:text-purple-500 font-medium">
              Upload a file
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {" "}
              or drag and drop
            </span>
          </label>
          <input
            id="json-upload"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {registrationType === "server" ? "modelcard.json" : "agentcard.json"}{" "}
          (JSON format)
        </p>
      </div>

      {/* JSON Preview */}
      {jsonContent && (
        <div>
          <span className={labelClass}>JSON Preview</span>
          <div className="relative">
            <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-auto max-h-64 text-sm text-gray-800 dark:text-gray-200">
              {jsonContent}
            </pre>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 shrink-0" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              About JSON Upload
            </h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Upload a{" "}
              {registrationType === "server"
                ? "modelcard.json"
                : "agentcard.json"}{" "}
              file to automatically populate the form fields. You can then
              review and modify the values before submitting.
            </p>
          </div>
        </div>
      </div>

      {/* Render the appropriate form below */}
      {jsonContent && (
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Review and Submit
          </h3>
          {registrationType === "server"
            ? renderServerForm()
            : renderAgentForm()}
        </div>
      )}

      {/* Cancel button when no JSON loaded */}
      {!jsonContent && (
        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  // Check permissions
  const canRegisterServer =
    (user?.ui_permissions?.register_service?.length ?? 0) > 0;
  const canRegisterAgent =
    (user?.ui_permissions?.publish_agent?.length ?? 0) > 0;

  if (!canRegisterServer && !canRegisterAgent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <ExclamationCircleIcon className="mx-auto h-12 w-12 text-yellow-400" />
          <h3 className="mt-4 text-lg font-medium text-yellow-800 dark:text-yellow-200">
            Permission Required
          </h3>
          <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            You do not have permission to register servers or agents. Please
            contact an administrator to request access.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 text-sm font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded-md transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Register New Service
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Register a new MCP server or A2A agent to the gateway registry.
        </p>
      </div>

      {/* Registration Type Selector */}
      <div className="mb-8">
        <p className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
          What would you like to register?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={!canRegisterServer}
            onClick={() => setRegistrationType("server")}
            className={`relative flex items-center p-4 border-2 rounded-xl transition-all backdrop-blur-sm ${
              registrationType === "server"
                ? "border-primary-500 bg-linear-to-r from-primary-500/10 to-indigo-500/10 dark:from-primary-900/30 dark:to-indigo-900/20 shadow-lg shadow-primary-500/10"
                : "border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/2 hover:border-gray-300 dark:hover:border-white/20"
            } ${!canRegisterServer ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <ServerIcon
              className={`h-8 w-8 ${
                registrationType === "server"
                  ? "text-purple-600"
                  : "text-gray-400"
              }`}
            />
            <div className="ml-4 text-left">
              <p
                className={`font-medium ${
                  registrationType === "server"
                    ? "text-purple-900 dark:text-purple-100"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                MCP Server
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Model Context Protocol server
              </p>
            </div>
            {registrationType === "server" && (
              <CheckCircleIcon className="absolute top-3 right-3 h-5 w-5 text-purple-600" />
            )}
          </button>

          <button
            type="button"
            disabled={!canRegisterAgent}
            onClick={() => setRegistrationType("agent")}
            className={`relative flex items-center p-4 border-2 rounded-xl transition-all backdrop-blur-sm ${
              registrationType === "agent"
                ? "border-primary-500 bg-linear-to-r from-primary-500/10 to-indigo-500/10 dark:from-primary-900/30 dark:to-indigo-900/20 shadow-lg shadow-primary-500/10"
                : "border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/2 hover:border-gray-300 dark:hover:border-white/20"
            } ${!canRegisterAgent ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <CpuChipIcon
              className={`h-8 w-8 ${
                registrationType === "agent"
                  ? "text-purple-600"
                  : "text-gray-400"
              }`}
            />
            <div className="ml-4 text-left">
              <p
                className={`font-medium ${
                  registrationType === "agent"
                    ? "text-purple-900 dark:text-purple-100"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                A2A Agent
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Agent-to-Agent protocol agent
              </p>
            </div>
            {registrationType === "agent" && (
              <CheckCircleIcon className="absolute top-3 right-3 h-5 w-5 text-purple-600" />
            )}
          </button>
        </div>
      </div>

      {/* Registration Mode Selector */}
      <div className="mb-8">
        <p className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
          Registration Method
        </p>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setRegistrationMode("form")}
            className={`flex items-center px-4 py-2 rounded-xl border transition-all ${
              registrationMode === "form"
                ? "border-primary-500 bg-linear-to-r from-primary-500/10 to-indigo-500/10 text-primary-700 dark:text-primary-300 shadow-sm"
                : "border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/2 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20"
            }`}
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Quick Form
          </button>
          <button
            type="button"
            onClick={() => setRegistrationMode("json")}
            className={`flex items-center px-4 py-2 rounded-xl border transition-all ${
              registrationMode === "json"
                ? "border-primary-500 bg-linear-to-r from-primary-500/10 to-indigo-500/10 text-primary-700 dark:text-primary-300 shadow-sm"
                : "border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/2 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20"
            }`}
          >
            <CloudArrowUpIcon className="h-5 w-5 mr-2" />
            JSON Upload
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white/80 dark:bg-white/3 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-white/8 p-6">
        {registrationMode === "form"
          ? registrationType === "server"
            ? renderServerForm()
            : renderAgentForm()
          : renderJsonUpload()}
      </div>
    </div>
  );
};

export default RegisterPage;
