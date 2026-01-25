"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
	className?: string;
	size?: "sm" | "md" | "lg";
}

const sizeClasses = {
	sm: "w-8 h-8",
	md: "w-10 h-10",
	lg: "w-12 h-12",
};

const iconSizes = {
	sm: "h-3.5 w-3.5",
	md: "h-4 w-4",
	lg: "h-5 w-5",
};

export function ModeToggle({ className, size = "md" }: ModeToggleProps) {
	const { resolvedTheme, toggleTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Avoid hydration mismatch by only rendering after mount
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		// Return a placeholder with same dimensions to avoid layout shift
		return <div className={cn(sizeClasses[size], "rounded-lg", className)} />;
	}

	return (
		<button
			type="button"
			onClick={toggleTheme}
			className={cn(
				sizeClasses[size],
				"flex items-center justify-center",
				"rounded-lg overflow-hidden",
				"hover:bg-gray-100 dark:hover:bg-white/10",
				"outline-none focus:ring-0 focus:outline-none",
				"active:ring-0 active:outline-none",
				"transition-colors duration-200",
				className,
			)}
			aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
		>
			<AnimatePresence mode="wait" initial={false}>
				{resolvedTheme === "light" ? (
					<motion.div
						key="sun"
						initial={{ x: 40, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: -40, opacity: 0 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
					>
						<IconSun
							className={cn(
								iconSizes[size],
								"shrink-0 text-gray-700 dark:text-gray-400",
							)}
						/>
					</motion.div>
				) : (
					<motion.div
						key="moon"
						initial={{ x: 40, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: -40, opacity: 0 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
					>
						<IconMoon
							className={cn(
								iconSizes[size],
								"shrink-0 text-gray-700 dark:text-gray-400",
							)}
						/>
					</motion.div>
				)}
			</AnimatePresence>
			<span className="sr-only">Toggle theme</span>
		</button>
	);
}

export { ModeToggle as ThemeToggle };
