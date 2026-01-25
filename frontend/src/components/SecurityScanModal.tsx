import {
	IconAlertTriangle,
	IconChevronDown,
	IconChevronRight,
	IconClipboard,
	IconRefresh,
	IconShield,
	IconShieldExclamation,
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
		"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-700",
	high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-700",
	medium:
		"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700",
	low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-700",
};

const _getStatusInfo = (
	scanResult: SecurityScanResult | null | undefined,
): StatusInfo => {
	if (!scanResult) {
		return { icon: IconShield, color: "gray", text: "No Scan Data" };
	}
	if (scanResult.scan_failed) {
		return { icon: IconAlertTriangle, color: "red", text: "Scan Failed" };
	}
	if (scanResult.critical_issues > 0 || scanResult.high_severity > 0) {
		return { icon: IconAlertTriangle, color: "red", text: "UNSAFE" };
	}
	if (scanResult.medium_severity > 0 || scanResult.low_severity > 0) {
		return { icon: IconShieldExclamation, color: "amber", text: "WARNING" };
	}
	return { icon: IconShield, color: "green", text: "SAFE" };
};

const _getStatusBannerClasses = (color: string): string => {
	switch (color) {
		case "green":
			return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
		case "amber":
			return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
		case "red":
			return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
		default:
			return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700";
	}
};

const _getStatusIconClasses = (color: string): string => {
	switch (color) {
		case "green":
			return "text-green-600 dark:text-green-400";
		case "amber":
			return "text-amber-600 dark:text-amber-400";
		case "red":
			return "text-red-600 dark:text-red-400";
		default:
			return "text-gray-500 dark:text-gray-400";
	}
};

const _getSeverityBadgeClasses = (severity: string): string => {
	const severityLower = severity.toLowerCase();
	switch (severityLower) {
		case "critical":
			return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
		case "high":
			return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
		case "medium":
			return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
		default:
			return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
	}
};

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
			onShowToast?.("Security scan results copied to clipboard!", "success");
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

	const statusInfo = _getStatusInfo(scanResult);
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
					<div className="flex items-center justify-center py-12">
						<IconRefresh className="h-8 w-8 animate-spin text-gray-400" />
						<span className="ml-3 text-gray-600 dark:text-gray-400">
							Loading scan results...
						</span>
					</div>
				) : !scanResult ? (
					<div className="text-center py-12">
						<IconShield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
						<p className="text-gray-600 dark:text-gray-400">
							No security scan results available for this {resourceType}.
						</p>
						{canRescan && onRescan && (
							<Button
								onClick={handleRescan}
								disabled={rescanning}
								className="mt-4"
							>
								{rescanning ? "Scanning..." : "Run Security Scan"}
							</Button>
						)}
					</div>
				) : (
					<div className="space-y-6">
						{/* Overall Status */}
						<div
							className={`p-4 rounded-lg border ${_getStatusBannerClasses(statusInfo.color)}`}
						>
							<div className="flex items-center gap-3">
								<StatusIcon
									className={`h-8 w-8 ${_getStatusIconClasses(statusInfo.color)}`}
								/>
								<div>
									<div className="font-semibold text-gray-900 dark:text-white">
										Overall Status: {statusInfo.text}
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-400">
										Scanned:{" "}
										{new Date(scanResult.scan_timestamp).toLocaleString()}
									</div>
								</div>
							</div>
							{scanResult.scan_failed && scanResult.error_message && (
								<div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-sm text-sm text-red-800 dark:text-red-300">
									Error: {scanResult.error_message}
								</div>
							)}
						</div>

						{/* Severity Summary */}
						<div>
							<h4 className="font-medium text-gray-900 dark:text-white mb-3">
								Severity Summary
							</h4>
							<div className="grid grid-cols-4 gap-3">
								{severityItems.map((item) => (
									<div
										key={item.key}
										className={`p-3 rounded-lg border text-center ${SEVERITY_BOX_STYLES[item.key]}`}
									>
										<div className="text-xs font-medium opacity-75">
											{item.label}
										</div>
										<div className="text-2xl font-bold">{item.count}</div>
									</div>
								))}
							</div>
						</div>

						{/* Analyzers Used */}
						{scanResult.analyzers_used &&
							scanResult.analyzers_used.length > 0 && (
								<div>
									<h4 className="font-medium text-gray-900 dark:text-white mb-3">
										Analyzers Used
									</h4>
									<div className="flex flex-wrap gap-2">
										{scanResult.analyzers_used.map((analyzer) => (
											<span
												key={analyzer}
												className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium"
											>
												{analyzer.toUpperCase()}
											</span>
										))}
									</div>
								</div>
							)}

						{/* Detailed Findings */}
						{scanResult.raw_output?.analysis_results && (
							<div>
								<h4 className="font-medium text-gray-900 dark:text-white mb-3">
									Detailed Findings
								</h4>
								<div className="border dark:border-gray-700 rounded-lg overflow-hidden">
									{Object.entries(scanResult.raw_output.analysis_results).map(
										([analyzer, analyzerData]) => {
											// Handle both formats: direct array or object with findings property
											const findings: SecurityFinding[] = Array.isArray(analyzerData)
												? analyzerData
												: (analyzerData as AnalyzerData)?.findings || [];
											const findingsCount = Array.isArray(findings)
												? findings.length
												: 0;

											return (
												<div
													key={analyzer}
													className="border-b dark:border-gray-700 last:border-b-0"
												>
													<button
														type="button"
														onClick={() => toggleAnalyzer(analyzer)}
														className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
													>
														<span className="font-medium text-gray-900 dark:text-white">
															{analyzer.charAt(0).toUpperCase() +
																analyzer.slice(1).replace(/_/g, " ")}{" "}
															Analysis
															<span className="ml-2 text-sm text-gray-500">
																({findingsCount} finding
																{findingsCount !== 1 ? "s" : ""})
															</span>
														</span>
														{expandedAnalyzers.has(analyzer) ? (
															<IconChevronDown className="h-5 w-5 text-gray-500" />
														) : (
															<IconChevronRight className="h-5 w-5 text-gray-500" />
														)}
													</button>
													{expandedAnalyzers.has(analyzer) && (
														<div className="p-3 bg-gray-50 dark:bg-gray-900/30 border-t dark:border-gray-700">
															{Array.isArray(findings) &&
															findings.length > 0 ? (
																<div className="space-y-3">
																	{findings.map((finding: SecurityFinding) => (
																		<div
																			key={`${finding.tool_name || finding.skill_name || ''}-${finding.severity}-${finding.threat_summary || ''}`}
																			className="p-3 bg-white dark:bg-gray-800 rounded-sm border dark:border-gray-700"
																		>
																			<div className="flex items-start justify-between mb-2">
																				<span className="font-medium text-gray-900 dark:text-white">
																					{finding.tool_name ||
																						finding.skill_name ||
																						"Finding"}
																				</span>
																				<span
																					className={`px-2 py-0.5 text-xs font-semibold rounded-sm ${_getSeverityBadgeClasses(finding.severity ?? "unknown")}`}
																				>
																					{finding.severity ?? "unknown"}
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
																									className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-sm"
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
							</div>
						)}

						{/* Raw JSON Toggle */}
						<div>
							<button
								type="button"
								onClick={() => setShowRawJson(!showRawJson)}
								className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
							>
								{showRawJson ? "Hide" : "View"} Raw JSON
							</button>
							{showRawJson && (
								<pre className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg overflow-x-auto text-xs text-gray-900 dark:text-gray-100 max-h-[30vh] overflow-y-auto">
									{JSON.stringify(scanResult, null, 2)}
								</pre>
							)}
						</div>

						{/* Action Buttons */}
						<div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
							<Button
								variant="ghost"
								onClick={handleCopy}
								className="flex items-center gap-2"
							>
								<IconClipboard className="h-4 w-4" />
								Copy Results
							</Button>
							{canRescan && onRescan && (
								<Button
									onClick={handleRescan}
									disabled={rescanning}
									className="flex items-center gap-2"
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
