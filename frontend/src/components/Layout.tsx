import { Menu, Transition } from "@headlessui/react";
import {
	ArrowRightOnRectangleIcon,
	Bars3Icon,
	ChevronDownIcon,
	Cog6ToothIcon,
	MoonIcon,
	SunIcon,
	UserIcon,
} from "@heroicons/react/24/outline";
import React, { Fragment, useEffect, useState } from "react";
import { Link } from "react-router";
import logo from "../assets/logo.png";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useServerStats } from "../hooks/useServerStats";
import Sidebar from "./Sidebar";

interface LayoutProps {
	children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [version, setVersion] = useState<string | null>(null);
	const { user, logout } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const { stats, activeFilter, setActiveFilter } = useServerStats();

	useEffect(() => {
		// Fetch version from API
		fetch("/api/version")
			.then((res) => res.json())
			.then((data) => setVersion(data.version))
			.catch((err) => console.error("Failed to fetch version:", err));
	}, []);

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#0f0f14] overflow-hidden">
			{/* Gradient mesh background */}
			<div className="fixed inset-0 bg-linear-to-br from-primary-500/5 via-transparent to-indigo-500/5 dark:from-primary-900/20 dark:via-transparent dark:to-indigo-900/10 pointer-events-none" />

			{/* Header */}
			<header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 shadow-sm">
				<div className="px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						{/* Left side */}
						<div className="flex items-center">
							{/* Sidebar toggle button - visible on all screen sizes */}
							<button
								type="button"
								className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500 mr-2"
								onClick={() => {
									console.log("Toggle clicked, current state:", sidebarOpen);
									setSidebarOpen(!sidebarOpen);
								}}
							>
								<Bars3Icon className="h-6 w-6" />
							</button>

							{/* Logo */}
							<div className="flex items-center ml-2 md:ml-0">
								<Link
									to="/"
									className="flex items-center hover:opacity-80 transition-opacity"
								>
									<img
										src={logo}
										alt="MCP Servers & A2A Agents Registry Logo"
										className="h-8 w-8 dark:brightness-0 dark:invert"
									/>
									<span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
										MCP Servers & A2A Agents Registry
									</span>
								</Link>
							</div>
						</div>

						{/* Right side */}
						<div className="flex items-center space-x-4">

							{/* Theme toggle */}
							<button
								type="button"
								onClick={toggleTheme}
								className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
							>
								{theme === "dark" ? (
									<SunIcon className="h-5 w-5" />
								) : (
									<MoonIcon className="h-5 w-5" />
								)}
							</button>

							{/* User dropdown */}
							<Menu as="div" className="relative">
								<div>
									<Menu.Button className="flex items-center space-x-3 text-sm rounded-full focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
										<div className="h-8 w-8 rounded-full bg-linear-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
											<UserIcon className="h-5 w-5 text-white" />
										</div>
										<span className="hidden md:block text-gray-700 dark:text-gray-100 font-medium">
											{user?.username || "Admin"}
										</span>
										<ChevronDownIcon className="h-4 w-4 text-gray-400" />
									</Menu.Button>
								</div>

								<Transition
									as={Fragment}
									enter="transition ease-out duration-100"
									enterFrom="transform opacity-0 scale-95"
									enterTo="transform opacity-100 scale-100"
									leave="transition ease-in duration-75"
									leaveFrom="transform opacity-100 scale-100"
									leaveTo="transform opacity-0 scale-95"
								>
									<Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl py-1 shadow-xl border border-gray-200/50 dark:border-white/10 focus:outline-hidden">
										<Menu.Item>
											{({ active }) => (
												<Link
													to="/settings"
													className={`${
														active ? "bg-white/50 dark:bg-white/10" : ""
													} flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-100 transition-colors`}
												>
													<Cog6ToothIcon className="mr-3 h-4 w-4" />
													Settings
												</Link>
											)}
										</Menu.Item>

										{/* Version display */}
										{version && (
											<div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
												<span className="px-2 py-0.5 bg-linear-to-r from-primary-500/10 to-indigo-500/10 rounded-md border border-primary-500/20 text-primary-600 dark:text-primary-300 font-medium">
													{version}
												</span>
											</div>
										)}

										<div className="border-t border-gray-200/50 dark:border-white/10 my-1" />

										<Menu.Item>
											{({ active }) => (
												<button
													type="button"
													onClick={handleLogout}
													className={`${
														active ? "bg-white/50 dark:bg-white/10" : ""
													} flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-100 transition-colors`}
												>
													<ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
													Sign out
												</button>
											)}
										</Menu.Item>
									</Menu.Items>
								</Transition>
							</Menu>
						</div>
					</div>
				</div>
			</header>

			<div className="flex h-screen pt-16">
				{/* Sidebar */}
				<Sidebar
					sidebarOpen={sidebarOpen}
					setSidebarOpen={setSidebarOpen}
					stats={stats}
					activeFilter={activeFilter}
					setActiveFilter={setActiveFilter}
				/>

				{/* Main content */}
				<main
					className={`flex-1 flex flex-col transition-all duration-300 ${
						sidebarOpen ? "md:ml-64 lg:ml-72 xl:ml-80" : ""
					}`}
				>
					<div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4 md:py-8 overflow-y-auto">
						{React.cloneElement(
							children as React.ReactElement<{ activeFilter?: string }>,
							{
								activeFilter,
							},
						)}
					</div>
				</main>
			</div>
		</div>
	);
};

export default Layout;
