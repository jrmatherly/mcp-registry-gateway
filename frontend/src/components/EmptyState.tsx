import {
  CpuChipIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  ServerStackIcon,
} from "@heroicons/react/24/outline";
import type React from "react";

type EmptyStateVariant = "servers" | "agents" | "search" | "generic";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  searchTerm?: string;
}

const variantConfig = {
  servers: {
    icon: ServerStackIcon,
    defaultTitle: "No servers found",
    defaultDescription: "Get started by registering your first MCP server.",
    iconBg: "bg-primary-500/10",
    iconColor: "text-primary-500",
  },
  agents: {
    icon: CpuChipIcon,
    defaultTitle: "No agents found",
    defaultDescription: "A2A agents will appear here once registered.",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
  },
  search: {
    icon: MagnifyingGlassIcon,
    defaultTitle: "No results found",
    defaultDescription:
      "Try adjusting your search or press Enter for semantic search.",
    iconBg: "bg-gray-500/10",
    iconColor: "text-gray-400",
  },
  generic: {
    icon: FolderPlusIcon,
    defaultTitle: "Nothing here yet",
    defaultDescription: "Content will appear here once available.",
    iconBg: "bg-gray-500/10",
    iconColor: "text-gray-400",
  },
};

/**
 * EmptyState - Enhanced empty state component with friendly illustrations
 * and helpful messaging for when no content is available.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  variant = "generic",
  title,
  description,
  actionLabel,
  onAction,
  searchTerm,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayDescription = searchTerm
    ? `No results for "${searchTerm}". Try a different search term or press Enter for semantic search.`
    : description || config.defaultDescription;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-white/2 dark:to-white/1" />

      {/* Decorative dots pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-10">
        <div className="absolute top-4 left-8 w-2 h-2 bg-primary-400 rounded-full" />
        <div className="absolute top-12 left-16 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        <div className="absolute bottom-8 right-12 w-2 h-2 bg-indigo-400 rounded-full" />
        <div className="absolute bottom-16 right-24 w-1 h-1 bg-pink-400 rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6">
        {/* Icon container with glow */}
        <div className={`relative mb-6`}>
          <div
            className={`absolute inset-0 ${config.iconBg} rounded-2xl blur-xl scale-150 opacity-50`}
          />
          <div
            className={`relative p-5 ${config.iconBg} rounded-2xl border border-white/50 dark:border-white/10`}
          >
            <Icon className={`h-10 w-10 ${config.iconColor}`} />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
          {displayTitle}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6 leading-relaxed">
          {displayDescription}
        </p>

        {/* Action button */}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary"
          >
            <FolderPlusIcon className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
