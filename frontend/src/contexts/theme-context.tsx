"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
	theme: Theme;
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "mcp-registry-theme";

function getSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

interface ThemeProviderProps {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
}

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<Theme>(() => {
		// On first render, try to get from localStorage
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(storageKey);
			if (stored === "light" || stored === "dark" || stored === "system") {
				return stored;
			}
		}
		return defaultTheme;
	});

	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
		if (theme === "system") {
			return getSystemTheme();
		}
		return theme;
	});

	// Update resolved theme when theme or system preference changes
	useEffect(() => {
		const updateResolvedTheme = () => {
			const resolved = theme === "system" ? getSystemTheme() : theme;
			setResolvedTheme(resolved);

			// Update DOM
			const root = document.documentElement;
			root.classList.remove("light", "dark");
			root.classList.add(resolved);

			// Also set a data attribute for more specific styling
			root.setAttribute("data-theme", resolved);
		};

		updateResolvedTheme();

		// Listen for system theme changes
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			if (theme === "system") {
				updateResolvedTheme();
			}
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	const setTheme = useCallback(
		(newTheme: Theme) => {
			setThemeState(newTheme);
			localStorage.setItem(storageKey, newTheme);
		},
		[storageKey],
	);

	const toggleTheme = useCallback(() => {
		setTheme(resolvedTheme === "dark" ? "light" : "dark");
	}, [resolvedTheme, setTheme]);

	const value = useMemo(
		() => ({
			theme,
			resolvedTheme,
			setTheme,
			toggleTheme,
		}),
		[theme, resolvedTheme, setTheme, toggleTheme],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}

// Export types for external use
export type { Theme, ResolvedTheme, ThemeContextValue, ThemeProviderProps };
