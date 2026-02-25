"use client";

import { useEffect, useState } from "react";

interface Build {
  id: string;
  project_path: string;
  plan_path: string | null;
  status: "pending" | "running" | "paused" | "completed" | "failed";
  current_sprint: number;
  current_task: number;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    cost: number;
  };
}

interface BuildsData {
  builds: Build[];
  activeBuilds: number;
  totalBuilds: number;
  totalTokens: {
    total: number;
    cost: number;
  };
  checkpointsCount: number;
  actionsCount: Record<string, number>;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "#4ade80";
    case "running":
      return "#fbbf24";
    case "failed":
      return "#f87171";
    case "paused":
      return "#60a5fa";
    default:
      return "#9ca3af";
  }
}

function formatDuration(startedAt: string, completedAt?: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const duration = end - start;

  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export default function BuildsPage() {
  const [data, setData] = useState<BuildsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/builds")
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setData(result.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;
  if (!data) return <div className="empty-state"><h3>No Data</h3><p>Failed to load builds</p></div>;

  return (
    <>
      <div className="page-header">
        <h2>Builds</h2>
        <p>Build execution history and monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: "1.5rem" }}>
        <div className="card">
          <div className="card-header">Active Builds</div>
          <div className="stat-value" style={{ color: "#fbbf24" }}>{data.activeBuilds}</div>
          <div className="stat-label">in progress</div>
        </div>
        <div className="card">
          <div className="card-header">Total Builds</div>
          <div className="stat-value">{data.totalBuilds}</div>
          <div className="stat-label">all time</div>
        </div>
        <div className="card">
          <div className="card-header">Token Usage</div>
          <div className="stat-value">{formatTokens(data.totalTokens.total)}</div>
          <div className="stat-label">${data.totalTokens.cost.toFixed(4)} spent</div>
        </div>
        <div className="card">
          <div className="card-header">Checkpoints</div>
          <div className="stat-value">{data.checkpointsCount}</div>
          <div className="stat-label">saved states</div>
        </div>
      </div>

      {/* Builds Table */}
      <div className="card">
        <div className="card-header">Recent Builds</div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Build ID</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Duration</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {data.builds.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                    No builds yet. Run "sophia build" to start your first build.
                  </td>
                </tr>
              ) : (
                data.builds.map((build) => (
                  <tr key={build.id}>
                    <td>
                      <code className="mono">{build.id.slice(0, 8)}...</code>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: getStatusColor(build.status),
                          color: "#000",
                          fontWeight: 600,
                        }}
                      >
                        {build.status}
                      </span>
                    </td>
                    <td>
                      Sprint {build.current_sprint + 1}, Task {build.current_task + 1}
                    </td>
                    <td>{formatDuration(build.started_at, build.completed_at)}</td>
                    <td>{formatTokens(build.tokenUsage.total)}</td>
                    <td>${build.tokenUsage.cost.toFixed(4)}</td>
                    <td>{new Date(build.started_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions Overview */}
      {Object.keys(data.actionsCount).length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="card-header">Actions Overview</div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {Object.entries(data.actionsCount).map(([status, count]) => (
              <div
                key={status}
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  className="badge"
                  style={{
                    background:
                      status === "approved"
                        ? "#4ade80"
                        : status === "rejected"
                        ? "#f87171"
                        : status === "pending"
                        ? "#fbbf24"
                        : "#9ca3af",
                    color: "#000",
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
                <span style={{ textTransform: "capitalize" }}>{status.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
