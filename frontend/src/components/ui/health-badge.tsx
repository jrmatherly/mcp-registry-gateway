import { cva, type VariantProps } from "class-variance-authority";
import { IconCheck, IconAlertTriangle, IconX } from "@tabler/icons-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const healthBadgeVariants = cva(
	"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
	{
		variants: {
			status: {
				healthy:
					"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10",
				degraded:
					"bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10",
				unhealthy:
					"bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 shadow-sm shadow-red-500/10",
				unknown:
					"bg-gray-500/15 text-gray-700 dark:text-gray-300 border border-gray-500/30 shadow-sm shadow-gray-500/10",
			},
			size: {
				default: "px-3 py-1 text-xs",
				sm: "px-2 py-0.5 text-[10px]",
				lg: "px-4 py-1.5 text-sm",
			},
		},
		defaultVariants: {
			status: "unknown",
			size: "default",
		},
	},
);

const statusConfig = {
	healthy: {
		icon: IconCheck,
		label: "Healthy",
		description: "All checks passing",
	},
	degraded: {
		icon: IconAlertTriangle,
		label: "Degraded",
		description: "Partial issues detected",
	},
	unhealthy: {
		icon: IconX,
		label: "Unhealthy",
		description: "Server unreachable or failing",
	},
	unknown: {
		icon: IconAlertTriangle,
		label: "Unknown",
		description: "Status not available",
	},
} as const;

export type HealthStatus = keyof typeof statusConfig;

interface HealthBadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof healthBadgeVariants> {
	status: HealthStatus;
	showIcon?: boolean;
	showLabel?: boolean;
	lastChecked?: string;
}

function HealthBadge({
	className,
	status = "unknown",
	size = "default",
	showIcon = true,
	showLabel = true,
	lastChecked,
	...props
}: HealthBadgeProps) {
	const config = statusConfig[status];
	const Icon = config.icon;

	return (
		<span
			data-slot="health-badge"
			data-status={status}
			className={cn(healthBadgeVariants({ status, size }), className)}
			title={lastChecked ? `${config.description} • Last checked: ${lastChecked}` : config.description}
			{...props}
		>
			{showIcon && <Icon className="h-3 w-3" />}
			{showLabel && <span>{config.label}</span>}
		</span>
	);
}

/**
 * Converts server status string to HealthStatus type
 */
function getHealthStatus(serverStatus: string | undefined): HealthStatus {
	switch (serverStatus) {
		case "healthy":
			return "healthy";
		case "healthy-auth-expired":
			return "degraded";
		case "unhealthy":
			return "unhealthy";
		default:
			return "unknown";
	}
}

export { HealthBadge, healthBadgeVariants, getHealthStatus };
