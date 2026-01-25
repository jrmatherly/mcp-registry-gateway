import {
  IconKey,
  IconMoon,
  IconShield,
  IconSun,
  IconUser,
} from "@tabler/icons-react";
import type React from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>

      {/* User Profile Section */}
      <div className="bg-white/80 dark:bg-white/3 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-white/8 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/6 bg-linear-to-r from-gray-50/80 to-transparent dark:from-white/2 dark:to-transparent">
          <div className="flex items-center">
            <div className="p-2 bg-primary-500/10 rounded-lg mr-3">
              <IconUser className="h-5 w-5 text-primary-500" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Profile
            </h2>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Username
            </span>
            <span className="text-sm text-gray-900 dark:text-white">
              {user?.username || "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Email
            </span>
            <span className="text-sm text-gray-900 dark:text-white">
              {user?.email || "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Authentication Provider
            </span>
            <span className="text-sm text-gray-900 dark:text-white capitalize">
              {user?.provider || user?.auth_method || "Keycloak"}
            </span>
          </div>
        </div>
      </div>

      {/* Scopes Section */}
      {user?.scopes && user.scopes.length > 0 && (
        <div className="bg-white/80 dark:bg-white/3 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-white/8 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/6 bg-linear-to-r from-gray-50/80 to-transparent dark:from-white/2 dark:to-transparent">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-500/10 rounded-lg mr-3">
                <IconShield className="h-5 w-5 text-emerald-500" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Permissions
              </h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {user.scopes.map((scope: string) => (
                <span
                  key={scope}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-linear-to-r from-primary-500/20 to-indigo-500/20 text-primary-600 dark:text-primary-300 border border-primary-500/30"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appearance Section */}
      <div className="bg-white/80 dark:bg-white/3 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-white/8 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/6 bg-linear-to-r from-gray-50/80 to-transparent dark:from-white/2 dark:to-transparent">
          <div className="flex items-center">
            <div className="p-2 bg-amber-500/10 rounded-lg mr-3">
              {theme === "dark" ? (
                <IconMoon className="h-5 w-5 text-amber-500" />
              ) : (
                <IconSun className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Appearance
            </h2>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Dark Mode
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Toggle between light and dark theme
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                theme === "dark" ? "bg-primary-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                  theme === "dark" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Token Generation Link */}
      <div className="bg-white/80 dark:bg-white/3 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-white/8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/6 bg-linear-to-r from-gray-50/80 to-transparent dark:from-white/2 dark:to-transparent">
          <div className="flex items-center">
            <div className="p-2 bg-cyan-500/10 rounded-lg mr-3">
              <IconKey className="h-5 w-5 text-cyan-500" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              API Access
            </h2>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                API Tokens
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Generate personal access tokens to authenticate with the MCP
                Gateway Registry API. Tokens can be scoped to specific
                permissions and have configurable expiration times.
              </p>
            </div>
            <div>
              <Link
                to="/generate-token"
                className="btn-primary inline-flex items-center"
              >
                Generate Token
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
