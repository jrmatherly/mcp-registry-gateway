import { KeyIcon, MoonIcon, ShieldCheckIcon, SunIcon, UserIcon } from '@heroicons/react/24/outline';
import type React from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      {/* User Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Profile</h2>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</span>
            <span className="text-sm text-gray-900 dark:text-white">{user?.username || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</span>
            <span className="text-sm text-gray-900 dark:text-white">{user?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Authentication Provider
            </span>
            <span className="text-sm text-gray-900 dark:text-white capitalize">
              {user?.provider || user?.auth_method || 'Keycloak'}
            </span>
          </div>
        </div>
      </div>

      {/* Scopes Section */}
      {user?.scopes && user.scopes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Permissions</h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {user.scopes.map((scope: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appearance Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {theme === 'dark' ? (
              <MoonIcon className="h-5 w-5 text-gray-400 mr-2" />
            ) : (
              <SunIcon className="h-5 w-5 text-gray-400 mr-2" />
            )}
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h2>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Toggle between light and dark theme
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                theme === 'dark' ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Token Generation Link */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">API Access</h2>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">API Tokens</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Generate personal access tokens to authenticate with the MCP Gateway Registry API.
                Tokens can be scoped to specific permissions and have configurable expiration times.
              </p>
            </div>
            <div>
              <Link
                to="/generate-token"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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
