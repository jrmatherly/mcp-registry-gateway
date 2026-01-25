import { cva, type VariantProps } from "class-variance-authority";
import {
	IconCheck,
	IconDownload,
	IconPlayerPlay,
	IconPlayerStop,
	IconRefresh,
	IconX,
} from "@tabler/icons-react";
import type * as React from "react";
import { useCallback } from "react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

const bulkActionsBarVariants = cva(
	"fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300",
	{
		variants: {
			variant: {
				default:
					"bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-white/10",
				primary:
					"bg-primary-500/95 dark:bg-primary-600/95 backdrop-blur-xl border border-primary-400/50 text-white",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BulkAction {
	id: string;
	label: string;
	icon: React.ReactNode;
	onClick: (selectedIds: string[]) => void | Promise<void>;
	variant?: "default" | "destructive" | "outline" | "ghost";
	disabled?: boolean;
	loading?: boolean;
}

interface BulkActionsBarProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof bulkActionsBarVariants> {
	selectedCount: number;
	selectedIds: string[];
	totalCount: number;
	onSelectAll?: () => void;
	onDeselectAll: () => void;
	onEnableSelected?: (ids: string[]) => void | Promise<void>;
	onDisableSelected?: (ids: string[]) => void | Promise<void>;
	onRefreshHealth?: (ids: string[]) => void | Promise<void>;
	onExport?: (ids: string[]) => void | Promise<void>;
	customActions?: BulkAction[];
	isEnabling?: boolean;
	isDisabling?: boolean;
	isRefreshing?: boolean;
	isExporting?: boolean;
}

function BulkActionsBar({
	className,
	variant,
	selectedCount,
	selectedIds,
	totalCount,
	onSelectAll,
	onDeselectAll,
	onEnableSelected,
	onDisableSelected,
	onRefreshHealth,
	onExport,
	customActions = [],
	isEnabling = false,
	isDisabling = false,
	isRefreshing = false,
	isExporting = false,
	...props
}: BulkActionsBarProps) {
	const handleEnableAll = useCallback(() => {
		onEnableSelected?.(selectedIds);
	}, [onEnableSelected, selectedIds]);

	const handleDisableAll = useCallback(() => {
		onDisableSelected?.(selectedIds);
	}, [onDisableSelected, selectedIds]);

	const handleRefreshHealth = useCallback(() => {
		onRefreshHealth?.(selectedIds);
	}, [onRefreshHealth, selectedIds]);

	const handleExport = useCallback(() => {
		onExport?.(selectedIds);
	}, [onExport, selectedIds]);

	// Don't render if nothing is selected
	if (selectedCount === 0) {
		return null;
	}

	const allSelected = selectedCount === totalCount && totalCount > 0;

	return (
		<div
			data-slot="bulk-actions-bar"
			className={cn(bulkActionsBarVariants({ variant }), className)}
			role="toolbar"
			aria-label="Bulk actions"
			{...props}
		>
			{/* Selection Count */}
			<div className="flex items-center gap-2 pr-3 border-r border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold">
					{selectedCount}
				</div>
				<span className="text-sm font-medium text-gray-700 dark:text-gray-200">
					selected
				</span>
			</div>

			{/* Select All / Deselect All */}
			<div className="flex items-center gap-1">
				{onSelectAll && !allSelected && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onSelectAll}
						className="text-xs"
					>
						<IconCheck className="h-3.5 w-3.5 mr-1" />
						Select All
					</Button>
				)}
				<Button
					variant="ghost"
					size="sm"
					onClick={onDeselectAll}
					className="text-xs"
				>
					<IconX className="h-3.5 w-3.5 mr-1" />
					Clear
				</Button>
			</div>

			{/* Divider */}
			<div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

			{/* Standard Actions */}
			<div className="flex items-center gap-2">
				{onEnableSelected && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleEnableAll}
						disabled={isEnabling}
						className="text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
					>
						<IconPlayerPlay
							className={cn("h-3.5 w-3.5 mr-1", isEnabling && "animate-pulse")}
						/>
						Enable
					</Button>
				)}

				{onDisableSelected && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleDisableAll}
						disabled={isDisabling}
						className="text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
					>
						<IconPlayerStop
							className={cn("h-3.5 w-3.5 mr-1", isDisabling && "animate-pulse")}
						/>
						Disable
					</Button>
				)}

				{onRefreshHealth && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefreshHealth}
						disabled={isRefreshing}
						className="text-xs"
					>
						<IconRefresh
							className={cn("h-3.5 w-3.5 mr-1", isRefreshing && "animate-spin")}
						/>
						Refresh Health
					</Button>
				)}

				{onExport && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						disabled={isExporting}
						className="text-xs"
					>
						<IconDownload
							className={cn("h-3.5 w-3.5 mr-1", isExporting && "animate-bounce")}
						/>
						Export
					</Button>
				)}
			</div>

			{/* Custom Actions */}
			{customActions.length > 0 && (
				<>
					<div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
					<div className="flex items-center gap-2">
						{customActions.map((action) => (
							<Button
								key={action.id}
								variant={action.variant || "outline"}
								size="sm"
								onClick={() => action.onClick(selectedIds)}
								disabled={action.disabled || action.loading}
								className="text-xs"
							>
								{action.icon}
								<span className="ml-1">{action.label}</span>
							</Button>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export { BulkActionsBar, bulkActionsBarVariants };
