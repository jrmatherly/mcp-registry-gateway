import * as React from "react";
import { cn } from "@/lib/utils";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
	as?: HeadingLevel;
	size?: HeadingSize;
	children: React.ReactNode;
	gradient?: boolean;
}

const sizeVariants: Record<HeadingSize, string> = {
	xs: "text-lg md:text-xl leading-snug",
	sm: "text-xl md:text-2xl leading-snug",
	md: "text-2xl md:text-3xl leading-tight",
	lg: "text-3xl md:text-4xl leading-tight",
	xl: "text-4xl md:text-5xl leading-none",
	"2xl": "text-5xl md:text-6xl leading-none",
};

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
	(
		{
			as: Tag = "h2",
			size = "md",
			gradient = false,
			className,
			children,
			...props
		},
		ref,
	) => {
		return (
			<Tag
				ref={ref}
				className={cn(
					"font-semibold tracking-tight",
					"text-gray-900 dark:text-white",
					sizeVariants[size],
					gradient &&
						"bg-linear-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent",
					className,
				)}
				{...props}
			>
				{children}
			</Tag>
		);
	},
);
Heading.displayName = "Heading";

export { Heading };
export type { HeadingProps, HeadingLevel, HeadingSize };
