import {
	IconAlertTriangle,
	IconChevronDown,
	IconChevronRight,
	IconClipboard,
	IconRefresh,
	IconShield,
	IconShieldCheck,
	IconShieldExclamation,
	IconCheck,
} from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import type { SecurityScanResult } from "../types";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Re-export for consumers
export type { SecurityScanResult };

interface SecurityScanModalProps {
	resourceName: string;
	resourceType: "server" | "agent";
	isOpen: boolean;
	onClose: () => void;
	loading: boolean;
	scanResult?: SecurityScanResult | null;
	onRescan?: () => Promise<void>;
	canRescan?: boolean;
	onShowToast?: (message: string, type: "success" | "error") => void;
}

interface StatusInfo {
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	text: string;
	description: string;
}

// Type for security findings within analyzer results
interface SecurityFinding {
	tool_name?: string;
	skill_name?: string;
	severity?: string;
	threat_summary?: string;
	threat_names?: string[];
}

// Type for analyzer data that may contain findings
interface AnalyzerData {
	findings?: SecurityFinding[];
}

const SEVERITY_BOX_STYLES: Record<string, string> = {
	critical:
		"bg-linear-to-br from-red-500/20 to-red-600/10 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/50",
	high: "bg-linear-to-br from-orange-500/20 to-orange-600/10 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700/50",
	medium:
		"bg-linear-to-br from-amber-500/20 to-amber-600/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50",
	low: "bg-linear-to-br from-blue-500/20 to-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/50",
};

const getStatusInfo = (
	scanResult: SecurityScanResult | null | undefined,
): StatusInfo => {
	if (!scanResult) {
		return {
			icon: IconShield,
			color: "gray",
			text: "No Scan Data",
			description: "Run a security scan to check for vulnerabilities",
		};
	}
	if (scanResult.scan_failed) {
		return {
			icon: IconAlertTriangle,
			color: "red",
			text: "Scan Failed",
			description: "The security scan encountered an error",
		};
	}
	if (scanResult.critical_issues > 0 || scanResult.high_severity > 0) {
		return {
			icon: IconShieldExclamation,
			color: "red",
			text: "UNSAFE",
			description: "Critical or high severity issues detected",
		};
	}
	if (scanResult.medium_severity > 0 || scanResult.low_severity > 0) {
		return {
			icon: IconAlertTriangle,
			color: "amber",
			text: "WARNING",
			description: "Some issues detected that may need attention",
		};
	}
	return {
		icon: IconShieldCheck,
		color: "green",
		text: "SAFE",
		description: "No security issues detected",
	};
};

const getStatusBannerClasses = (color: string): string => {
	switch (color) {
		case "green":
			return "bg-linear-to-br from-emerald-500/15 to-green-500/10 border-emerald-300 dark:border-emerald-600/50";
		case "amber":
			return "bg-linear-to-br from-amber-500/15 to-orange-500/10 border-amber-300 dark:border-amber-600/50";
		case "red":
			return "bg-linear-to-br from-red-500/15 to-rose-500/10 border-red-300 dark:border-red-600/50";
		default:
			return "bg-linear-to-br from-gray-500/10 to-slate-500/5 border-gray-300 dark:border-gray-600/50";
	}
};

const getStatusIconClasses = (color: string): string => {
	switch (color) {
		case "green":
			return "text-emerald-600 dark:text-emerald-400";
		case "amber":
			return "text-amber-600 dark:text-amber-400";
		case "red":
			return "text-red-600 dark:text-red-400";
		default:
			return "text-gray-500 dark:text-gray-400";
	}
};

const getSeverityBadgeClasses = (severity: string): string => {
	const severityLower = severity.toLowerCase();
	switch (severityLower) {
		case "critical":
			return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-700/50";
		case "high":
			return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border border-orange-200 dark:border-orange-700/50";
		case "medium":
			return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50";
		default:
			return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50";
	}
};

/**
 * Section header component for grouping modal content
 */
const ScanSection: React.FC<{ title: string; children: React.ReactNode }> = ({
	title,
	children,
}) => (
	<div className="space-y-3">
		<h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10 pb-2">
			{title}
		</h4>
		{children}
	</div>
);

const SecurityScanModal: React.FC<SecurityScanModalProps> = ({
	resourceName,
	resourceType,
	isOpen,
	onClose,
	loading,
	scanResult,
	onRescan,
	canRescan,
	onShowToast,
}) => {
	const [showRawJson, setShowRawJson] = useState(false);
	const [expandedAnalyzers, setExpandedAnalyzers] = useState<Set<string>>(
		new Set(),
	);
	const [rescanning, setRescanning] = useState(false);
	const [copied, setCopied] = useState(false);

	if (!isOpen) {
		return null;
	}

	const toggleAnalyzer = (analyzer: string) => {
		const newExpanded = new Set(expandedAnalyzers);
		if (newExpanded.has(analyzer)) {
			newExpanded.delete(analyzer);
		} else {
			newExpanded.add(analyzer);
		}
		setExpandedAnalyzers(newExpanded);
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(scanResult, null, 2));
			setCopied(true);
			onShowToast?.("Security scan results copied to clipboard!", "success");
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy:", error);
			onShowToast?.("Failed to copy results", "error");
		}
	};

	const handleRescan = async () => {
		if (!onRescan || rescanning) return;
		setRescanning(true);
		try {
			await onRescan();
			onShowToast?.("Security scan completed", "success");
		} catch (_error) {
			onShowToast?.("Failed to rescan", "error");
		} finally {
			setRescanning(false);
		}
	};

	const statusInfo = getStatusInfo(scanResult);
	const StatusIcon = statusInfo.icon;

	const severityItems = [
		{
			label: "CRITICAL",
			count: scanResult?.critical_issues ?? 0,
			key: "critical",
		},
		{ label: "HIGH", count: scanResult?.high_severity ?? 0, key: "high" },
		{ label: "MEDIUM", count: scanResult?.medium_severity ?? 0, key: "medium" },
		{ label: "LOW", count: scanResult?.low_severity ?? 0, key: "low" },
	];

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="max-w-3xl max-h-[85vh] overflow-auto"
				showCloseButton={true}
			>
				<DialogHeader>
					<DialogTitle>Security Scan Results - {resourceName}</DialogTitle>
				</DialogHeader>

				{loading ? (
					<div className="flex flex-col items-center justify-center py-16">
						<div className="relative">
							<div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
							<IconRefresh className="h-10 w-10 animate-spin text-primary-500 relative" />
						</div>
						<span className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
							Analyzing security...
						</span>
					</div>
				) : !scanResult ? (
					/* Empty State - Enhanced with glassmorphism */
					<div className="text-center py-12">
						<div className="mx-auto w-20 h-20 rounded-full bg-linear-to-br from-gray-500/10 to-slate-500/5 dark:from-gray-400/10 dark:to-slate-600/5 flex items-center justify-center mb-6 border border-gray-200 dark:border-white/10">
							<IconShield className="h-10 w-10 text-gray-400 dark:text-gray-500" />
						</div>
						<p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
							No security scan results available
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
							Run a security scan to check this {resourceType} for
							vulnerabilities.
						</p>
						{canRescan && onRescan && (
							<Button
								onClick={handleRescan}
								disabled={rescanning}
								className="bg-primary-600 hover:bg-primary-700"
							>
								<IconShield className="h-4 w-4 mr-2" />
								{rescanning ? "Scanning..." : "Run Security Scan"}
							</Button>
						)}
					</div>
				) : (
					<div className="space-y-6">
						{/* Overall Status - Enhanced */}
						<div
							className={`p-4 rounded-xl border ${getStatusBannerClasses(statusInfo.color)}`}
						>
							<div className="flex items-center gap-4">
								<div
									className={`w-12 h-12 rounded-xl flex items-center justify-center ${
										statusInfo.color === "green"
											? "bg-emerald-500/20"
											: statusInfo.color === "amber"
												? "bg-amber-500/20"
												: statusInfo.color === "red"
													? "bg-red-500/20"
													: "bg-gray-500/20"
									}`}
								>
									<StatusIcon
										className={`h-6 w-6 ${getStatusIconClasses(statusInfo.color)}`}
									/>
								</div>
								<div className="flex-1">
									<div className="font-bold text-lg text-gray-900 dark:text-white">
										{statusInfo.text}
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-400">
										{statusInfo.description}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
										Scanned:{" "}
										{new Date(scanResult.scan_timestamp).toLocaleString()}
									</div>
								</div>
							</div>
							{scanResult.scan_failed && scanResult.error_message && (
								<div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700/50">
									<strong>Error:</strong> {scanResult.error_message}
								</div>
							)}
						</div>

						{/* Severity Summary */}
						<ScanSection title="Severity Summary">
							<div className="grid grid-cols-4 gap-3">
								{severityItems.map((item) => (
									<div
										key={item.key}
										className={`p-4 rounded-xl border text-center transition-all hover:scale-105 ${SEVERITY_BOX_STYLES[item.key]}`}
									>
										<div className="text-xs font-semibold opacity-75 mb-1">
											{item.label}
										</div>
										<div className="text-3xl font-bold">{item.count}</div>
									</div>
								))}
							</div>
						</ScanSection>

						{/* Analyzers Used */}
						{scanResult.analyzers_used && scanResult.analyzers_used.length > 0 && (
							<ScanSection title="Analyzers Used">
								<div className="flex flex-wrap gap-2">
									{scanResult.analyzers_used.map((analyzer) => (
										<span
											key={analyzer}
											className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium border border-gray-200 dark:border-white/10"
										>
											{analyzer.toUpperCase()}
										</span>
									))}
								</div>
							</ScanSection>
						)}

						{/* Detailed Findings */}
						{scanResult.raw_output?.analysis_results && (
							<ScanSection title="Detailed Findings">
								<div className="border dark:border-white/10 rounded-xl overflow-hidden">
									{Object.entries(scanResult.raw_output.analysis_results).map(
										([analyzer, analyzerData]) => {
											// Handle both formats: direct array or object with findings property
											const findings: SecurityFinding[] = Array.isArray(
												analyzerData,
											)
												? analyzerData
												: ((analyzerData as AnalyzerData)?.findings || []);
											const findingsCount = Array.isArray(findings)
												? findings.length
												: 0;

											return (
												<div
													key={analyzer}
													className="border-b dark:border-white/10 last:border-b-0"
												>
													<button
														type="button"
														onClick={() => toggleAnalyzer(analyzer)}
														className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
													>
														<span className="font-medium text-gray-900 dark:text-white">
															{analyzer.charAt(0).toUpperCase() +
																analyzer.slice(1).replace(/_/g, " ")}{" "}
															Analysis
															<span className="ml-2 text-sm text-gray-500 font-normal">
																({findingsCount} finding
																{findingsCount !== 1 ? "s" : ""})
															</span>
														</span>
														{expandedAnalyzers.has(analyzer) ? (
															<IconChevronDown className="h-5 w-5 text-gray-400" />
														) : (
															<IconChevronRight className="h-5 w-5 text-gray-400" />
														)}
													</button>
													{expandedAnalyzers.has(analyzer) && (
														<div className="p-4 bg-gray-50 dark:bg-white/3 border-t dark:border-white/10">
															{Array.isArray(findings) && findings.length > 0 ? (
																<div className="space-y-3">
																	{findings.map((finding: SecurityFinding) => (
																		<div
																			key={`${finding.tool_name || finding.skill_name || ""}-${finding.severity}-${finding.threat_summary || ""}`}
																			className="p-4 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-white/10"
																		>
																			<div className="flex items-start justify-between mb-2">
																				<span className="font-medium text-gray-900 dark:text-white">
																					{finding.tool_name ||
																						finding.skill_name ||
																						"Finding"}
																				</span>
																				<span
																					className={`px-2 py-0.5 text-xs font-semibold rounded-lg ${getSeverityBadgeClasses(finding.severity ?? "unknown")}`}
																				>
																					{(
																						finding.severity ?? "unknown"
																					).toUpperCase()}
																				</span>
																			</div>
																			{finding.threat_summary && (
																				<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
																					{finding.threat_summary}
																				</p>
																			)}
																			{finding.threat_names &&
																				finding.threat_names.length > 0 && (
																					<div className="flex flex-wrap gap-1">
																						{finding.threat_names.map(
																							(threat: string) => (
																								<span
																									key={threat}
																									className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-white/10"
																								>
																									{threat}
																								</span>
																							),
																						)}
																					</div>
																				)}
																		</div>
																	))}
																</div>
															) : (
																<p className="text-gray-500 dark:text-gray-400 text-sm">
																	No findings from this analyzer.
																</p>
															)}
														</div>
													)}
												</div>
											);
										},
									)}
								</div>
							</ScanSection>
						)}

						{/* Raw JSON Toggle */}
						<div>
							<button
								type="button"
								onClick={() => setShowRawJson(!showRawJson)}
								className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
							>
								{showRawJson ? "Hide" : "View"} Raw JSON
							</button>
							{showRawJson && (
								<div className="mt-3 rounded-xl overflow-hidden border border-gray-700 dark:border-white/10">
									<div className="bg-gray-800 dark:bg-gray-900/80 text-gray-300 px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-gray-700 dark:border-white/10">
										<span>scan_result.json</span>
										<span className="text-gray-500">JSON</span>
									</div>
									<pre className="p-4 bg-gray-900 dark:bg-[#0d1117] overflow-x-auto text-xs text-gray-100 max-h-[30vh] overflow-y-auto font-mono">
										{JSON.stringify(scanResult, null, 2)}
									</pre>
								</div>
							)}
						</div>

						{/* Action Buttons */}
						<div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-white/10">
							<Button
								variant="outline"
								onClick={handleCopy}
								className="flex items-center gap-2"
							>
								{copied ? (
									<>
										<IconCheck className="h-4 w-4" />
										Copied!
									</>
								) : (
									<>
										<IconClipboard className="h-4 w-4" />
										Copy Results
									</>
								)}
							</Button>
							{canRescan && onRescan && (
								<Button
									onClick={handleRescan}
									disabled={rescanning}
									className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700"
								>
									<IconRefresh
										className={`h-4 w-4 ${rescanning ? "animate-spin" : ""}`}
									/>
									{rescanning ? "Scanning..." : "Rescan"}
								</Button>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default SecurityScanModal;
