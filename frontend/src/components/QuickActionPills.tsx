import {
  ArrowPathIcon,
  CpuChipIcon,
  PlusIcon,
  ServerStackIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type React from "react";

type QuickAction = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  variant?: "primary" | "secondary" | "accent";
};

interface QuickActionPillsProps {
  onRegisterServer?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onViewServers?: () => void;
  onViewAgents?: () => void;
  isRefreshing?: boolean;
  customActions?: QuickAction[];
}

/**
 * QuickActionPills - Horizontal pill buttons for quick actions
 * Inspired by modern AI assistants and search interfaces.
 */
const QuickActionPills: React.FC<QuickActionPillsProps> = ({
  onRegisterServer,
  onSearch,
  onRefresh,
  onViewServers,
  onViewAgents,
  isRefreshing = false,
  customActions = [],
}) => {
  const defaultActions: QuickAction[] = [
    ...(onRegisterServer
      ? [
          {
            id: "register",
            label: "Register Server",
            icon: PlusIcon,
            onClick: onRegisterServer,
            variant: "primary" as const,
          },
        ]
      : []),
    ...(onSearch
      ? [
          {
            id: "search",
            label: "Semantic Search",
            icon: SparklesIcon,
            onClick: onSearch,
            variant: "accent" as const,
          },
        ]
      : []),
    ...(onViewServers
      ? [
          {
            id: "servers",
            label: "MCP Servers",
            icon: ServerStackIcon,
            onClick: onViewServers,
            variant: "secondary" as const,
          },
        ]
      : []),
    ...(onViewAgents
      ? [
          {
            id: "agents",
            label: "A2A Agents",
            icon: CpuChipIcon,
            onClick: onViewAgents,
            variant: "secondary" as const,
          },
        ]
      : []),
    ...(onRefresh
      ? [
          {
            id: "refresh",
            label: "Refresh All",
            icon: ArrowPathIcon,
            onClick: onRefresh,
            variant: "secondary" as const,
          },
        ]
      : []),
  ];

  const allActions = [...defaultActions, ...customActions];

  if (allActions.length === 0) {
    return null;
  }

  const getVariantClasses = (variant: QuickAction["variant"] = "secondary") => {
    switch (variant) {
      case "primary":
        return "bg-linear-to-r from-primary-600 to-primary-700 text-white border-primary-500/50 hover:from-primary-500 hover:to-primary-600 shadow-lg shadow-primary-500/25";
      case "accent":
        return "bg-linear-to-r from-pink-500 to-rose-500 text-white border-pink-400/50 hover:from-pink-400 hover:to-rose-400 shadow-lg shadow-pink-500/25";
      default:
        return "bg-white/80 dark:bg-white/5 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-primary-300 dark:hover:border-primary-500/30";
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {allActions.map((action) => {
        const Icon = action.icon;
        const isRefreshButton = action.id === "refresh";

        return (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={isRefreshButton && isRefreshing}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              border backdrop-blur-sm transition-all duration-200
              hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              ${getVariantClasses(action.variant)}
            `}
          >
            <Icon
              className={`h-4 w-4 ${isRefreshButton && isRefreshing ? "animate-spin" : ""}`}
            />
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

export default QuickActionPills;
