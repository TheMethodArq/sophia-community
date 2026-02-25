"use client";

import { useEffect, useState } from "react";

interface Escalation {
  id: number;
  build_id: string;
  task_id: string;
  action_type: string;
  classification: string;
  status: string;
  created_at: string;
  project_path: string;
  severity: "low" | "medium" | "high";
}

interface Decision {
  id: number;
  build_id: string;
  task_id: string;
  action_type: string;
  status: string;
  resolved_at: string;
  project_path: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  autoApproved: number;
  total: number;
}

function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    file_write: "File Write",
    file_delete: "File Delete",
    dependency_add: "Add Dependency",
    command_exec: "Execute Command",
    git_commit: "Git Commit",
    config_change: "Config Change",
  };
  return labels[type] || type;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "#f87171";
    case "medium":
      return "#fbbf24";
    default:
      return "#4ade80";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "approved":
      return "#4ade80";
    case "rejected":
      return "#f87171";
    case "auto_approved":
      return "#60a5fa";
    default:
      return "#fbbf24";
  }
}

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const response = await fetch("/api/escalations");
      const result = await response.json();
      if (result.success) {
        setEscalations(result.data.escalations);
        setRecentDecisions(result.data.recentDecisions);
        setStats(result.data.stats);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function handleDecision(actionId: number, decision: "approved" | "rejected") {
    setProcessingId(actionId);
    try {
      const response = await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, decision }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to process decision:", error);
    }
    setProcessingId(null);
  }

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  return (
    <>
      <div className="page-header">
        <h2>Escalation Center</h2>
        <p>Review and approve actions requiring human intervention</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: "1.5rem" }}>
          <div className="card">
            <div className="card-header">Pending</div>
            <div className="stat-value" style={{ color: "#fbbf24" }}>{stats.pending}</div>
            <div className="stat-label">need approval</div>
          </div>
          <div className="card">
            <div className="card-header">Auto-Approved</div>
            <div className="stat-value" style={{ color: "#60a5fa" }}>{stats.autoApproved}</div>
            <div className="stat-label">low risk</div>
          </div>
          <div className="card">
            <div className="card-header">Approved</div>
            <div className="stat-value" style={{ color: "#4ade80" }}>{stats.approved}</div>
            <div className="stat-label">by humans</div>
          </div>
          <div className="card">
            <div className="card-header">Rejected</div>
            <div className="stat-value" style={{ color: "#f87171" }}>{stats.rejected}</div>
            <div className="stat-label">blocked</div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Pending Escalations */}
        <div className="card">
          <div className="card-header">
            Pending Escalations
            {escalations.length > 0 && (
              <span className="badge" style={{ marginLeft: "0.5rem", background: "#fbbf24", color: "#000" }}>
                {escalations.length}
              </span>
            )}
          </div>

          {escalations.length === 0 ? (
            <p style={{ color: "var(--text-dim)", padding: "1rem 0" }}>
              No pending escalations. All actions are within acceptable risk thresholds.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {escalations.map((esc) => (
                <div
                  key={esc.id}
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    background: "var(--bg-tertiary)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{getActionTypeLabel(esc.action_type)}</div>
                      <div style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>
                        Build: {esc.build_id.slice(0, 8)}... | Task: {esc.task_id.slice(0, 8)}...
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: getSeverityColor(esc.severity),
                        color: "#000",
                        fontWeight: 600,
                      }}
                    >
                      {esc.severity.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
                    {new Date(esc.created_at).toLocaleString()}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => handleDecision(esc.id, "approved")}
                      disabled={processingId === esc.id}
                    >
                      {processingId === esc.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      className="btn"
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "1px solid var(--red)",
                        color: "var(--red)",
                      }}
                      onClick={() => handleDecision(esc.id, "rejected")}
                      disabled={processingId === esc.id}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Decisions */}
        <div className="card">
          <div className="card-header">Recent Decisions</div>

          {recentDecisions.length === 0 ? (
            <p style={{ color: "var(--text-dim)", padding: "1rem 0" }}>No decisions made yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recentDecisions.map((decision) => (
                <div
                  key={decision.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "0.25rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{getActionTypeLabel(decision.action_type)}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                      {new Date(decision.resolved_at).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: getStatusColor(decision.status),
                      color: "#000",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                    }}
                  >
                    {decision.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
