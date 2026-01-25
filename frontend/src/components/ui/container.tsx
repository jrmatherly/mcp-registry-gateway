import * as React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	size?: "sm" | "md" | "lg" | "xl" | "full";
}

const containerSizes = {
	sm: "max-w-3xl",
	md: "max-w-5xl",
	lg: "max-w-7xl",
	xl: "max-w-screen-2xl",
	full: "max-w-full",
};

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
	({ children, className, size = "lg", ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					containerSizes[size],
					"mx-auto px-4 sm:px-6 lg:px-8",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);
Container.displayName = "Container";

export { Container };
