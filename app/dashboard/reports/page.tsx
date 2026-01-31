"use client";

import React, { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

interface Report {
  id: string;
  title: string;
  description?: string;
  createdAt: string | number;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  content?: string;
}

function formatTimestamp(timestamp: string | number): string {
  if (!timestamp) return "Unknown";
  const date = new Date(typeof timestamp === "number" ? timestamp * 1000 : timestamp);
  if (isNaN(date.getTime())) return String(timestamp);

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function Reports() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [createErrors, setCreateErrors] = useState<string>("");

  const { data: reportsData, isLoading, refetch, isFetched } = trpc.reports.getReports.useQuery();
  const generateReportMutation = trpc.reports.generateReport.useMutation({
    onSuccess: () => {
      setCreateModalOpen(false);
      setNewReportTitle("");
      setNewReportDescription("");
      refetch();
      toast.success("Report generation started successfully");
    },
    onError: (error) => {
      toast.error(`Failed to generate report: ${error.message}`);
    },
  });

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors("");
    if (!newReportTitle) return;
    try {
      await generateReportMutation.mutateAsync({
        title: newReportTitle,
        description: newReportDescription,
      });
    } catch (error: any) {
      setCreateErrors(error.message);
    }
  };

  useEffect(() => {
    if (reportsData) {
      const formattedReports: Report[] = reportsData.map((report) => ({
        id: report.id,
        createdAt: report.createdAt,
        title: report.title || "Unknown",
        description: report.description || undefined,
        fileType: report.fileType || "Unknown",
        fileSize: report.fileSize ? parseInt(report.fileSize) : 0,
        fileUrl: report.reportUrl || undefined,
        content: report.aiSummary || undefined,
      }));
      setReports(formattedReports);
    }
  }, [reportsData, isFetched]);


  const handleView = (report: Report) => {
    setSelectedReport(report);
    setViewModalOpen(true);
  };

  const handleDownload = async (report: Report) => {
    try {
      if (report.fileUrl) {
        const link = document.createElement("a");
        link.href = report.fileUrl;
        link.download = `${report.title}.${report.fileType}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (report.content) {
        const blob = new Blob([report.content], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${report.title}.${report.fileType}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const closeModal = () => {
    setViewModalOpen(false);
    setSelectedReport(null);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return (
          <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13H10v4.5H8.5V13zm3 0h1.5l1 2.5 1-2.5h1.5v4.5h-1.2v-2.8l-.9 2.3h-.8l-.9-2.3v2.8H11.5V13z" />
          </svg>
        );
      case "csv":
      case "xlsx":
      case "xls":
        return (
          <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h2v2H8v-2zm0 4h2v2H8v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2z" />
          </svg>
        );
      case "json":
        return (
          <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3h2v2H5v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 0 0-2-2H0v-2h1a2 2 0 0 0 2-2V5a2 2 0 0 1 2-2m14 0a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1v2h-1a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2v-2h2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5h-2V3h2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-bl from-black via-green-950/80 to-black text-white p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400">Reports</h1>
          <p className="text-gray-400 mt-1">View and download generated reports</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500 flex items-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate Report
          </button>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 bg-green-800 text-white border border-emerald-500 hover:bg-emerald-500/20 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Reports Summary */}
      {/* <div className="mb-8 p-6 bg-linear-to-r from-green-900/30 to-green-800/60 backdrop-blur-xl rounded-xl border border-green-700">
        <h2 className="text-xl font-semibold text-emerald-400 mb-4">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Reports" value={reports?.length || 0} />
          <StatCard
            label="PDF Reports"
            value={reports?.filter((r: Report) => r.fileType === "pdf").length || 0}
            color="text-red-400"
          />
          <StatCard
            label="CSV Reports"
            value={reports?.filter((r: Report) => r.fileType === "csv").length || 0}
            color="text-green-400"
          />
          <StatCard
            label="Other"
            value={displayReports?.filter((r: Report) => !["pdf", "csv"].includes(r.file_type)).length || 0}
            color="text-yellow-400"
          />
        </div>
      </div> */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {reports.map((report: Report) => (
          <div
            key={report.id}
            className="p-6 rounded-xl bg-linear-to-br from-green-900 to-green-800/20 border border-green-700 backdrop-blur-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col h-full"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-black/50 rounded-lg">
                {getFileIcon(report.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">{report.title}</h3>
                <p className="text-sm text-gray-400 truncate">{report.description || "No description"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400">Created</p>
                <p className="text-sm text-white">{formatTimestamp(report.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Size</p>
                <p className="text-sm text-white">{formatFileSize(report.fileSize)}</p>
              </div>
            </div>

            {/* <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${report.fileType === "pdf"
                ? "bg-red-500/20 text-red-400"
                : report.fileType === "csv"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
                }`}>
                {report.file_type}
              </span>
              {isUsingMockData && (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400">
                  Sample
                </span>
              )}
            </div> */}

            <div className="flex gap-3 pt-4 border-t border-gray-700 mt-auto">
              <button
                onClick={() => handleView(report)}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-300 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </button>
              <button
                onClick={() => handleDownload(report)}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-300 bg-green-800 text-white border border-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-green-900 rounded-2xl border border-green-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-green-700 flex justify-between items-center">
              <div className="flex items-center gap-4">
                {getFileIcon(selectedReport.fileType)}
                <div>
                  <h2 className="text-xl font-semibold text-emerald-400">{selectedReport.title}</h2>
                  <p className="text-sm text-gray-400">{selectedReport.description || "No description"}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto">
              {/* {isUsingMockData && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">This is sample data for demonstration purposes.</p>
                </div>
              )} */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <InfoCard label="File Type" value={selectedReport.fileType.toUpperCase()} />
                <InfoCard label="Size" value={formatFileSize(selectedReport.fileSize)} />
                <InfoCard label="Created" value={formatTimestamp(selectedReport.createdAt)} />
                <InfoCard label="ID" value={selectedReport.id} mono />
              </div>

              <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
                {selectedReport.content ? (
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-64 font-mono bg-black/30 p-4 rounded-lg">
                    {selectedReport.content.slice(0, 2000)}
                    {selectedReport.content.length > 2000 && "..."}
                  </pre>
                ) : selectedReport.fileUrl ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">Preview not available for this file type</p>
                    <a
                      href={selectedReport.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No preview available</p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-green-700 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-300 bg-gray-700 text-white hover:bg-gray-600"
              >
                Close
              </button>
              <button
                onClick={() => handleDownload(selectedReport)}
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-300 bg-emerald-500 text-black hover:bg-emerald-400 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-green-900 rounded-2xl border border-green-700 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-green-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-emerald-400">Generate Report</h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="p-6 flex-1">
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                    Report Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newReportTitle}
                    onChange={(e) => setNewReportTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-black/50 border border-green-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter report title"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newReportDescription}
                    onChange={(e) => setNewReportDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-black/50 border border-green-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter report description (optional)"
                  />
                </div>
              </div>

              {createErrors && (
                <p className="mt-1 text-red-500 text-sm">{createErrors}</p>
              )}

              <div className="mt-3 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-6 py-2 rounded-lg font-semibold transition-all duration-300 bg-gray-700 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generateReportMutation.isPending}
                  className="px-6 py-2 rounded-lg font-semibold transition-all duration-300 bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generateReportMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string; value: any; color?: string }) {
  return (
    <div className="p-3 bg-black/30 rounded-lg">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  color = "text-white",
  mono = false,
}: {
  label: string;
  value: any;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="p-4 bg-black/50 rounded-lg">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`${color} ${mono ? "font-mono text-sm truncate" : "font-semibold"}`}>{value}</p>
    </div>
  );
}

export default Reports;
