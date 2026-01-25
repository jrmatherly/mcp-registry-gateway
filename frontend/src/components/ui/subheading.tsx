import * as React from "react";
import { cn } from "@/lib/utils";

type SubheadingLevel = "p" | "span" | "h3" | "h4" | "h5" | "h6";
type SubheadingSize = "xs" | "sm" | "md" | "lg";

interface SubheadingProps extends React.HTMLAttributes<HTMLParagraphElement> {
	as?: SubheadingLevel;
	size?: SubheadingSize;
	children: React.ReactNode;
	muted?: boolean;
}

const sizeVariants: Record<SubheadingSize, string> = {
	xs: "text-xs md:text-sm",
	sm: "text-sm md:text-base",
	md: "text-base md:text-lg",
	lg: "text-lg md:text-xl",
};

const Subheading = React.forwardRef<HTMLParagraphElement, SubheadingProps>(
	(
		{ as: Tag = "p", size = "md", muted = true, className, children, ...props },
		ref,
	) => {
		return (
			<Tag
				ref={ref as React.Ref<HTMLParagraphElement>}
				className={cn(
					"font-normal leading-relaxed",
					muted
						? "text-gray-600 dark:text-gray-400"
						: "text-gray-800 dark:text-gray-200",
					sizeVariants[size],
					className,
				)}
				{...props}
			>
				{children}
			</Tag>
		);
	},
);
Subheading.displayName = "Subheading";

export { Subheading };
export type { SubheadingProps, SubheadingLevel, SubheadingSize };
