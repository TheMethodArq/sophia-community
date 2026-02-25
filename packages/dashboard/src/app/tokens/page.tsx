"use client";

import { useEffect, useState } from "react";

interface TimeSeriesPoint {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  builds: number;
}

interface ModelUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  requests: number;
}

interface BuildUsage {
  build_id: string;
  status: string;
  started_at: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  task_count: number;
}

interface Totals {
  input: number;
  output: number;
  total: number;
  cost: number;
  builds: number;
  requests: number;
  avgCostPerRequest: number;
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

function formatCurrency(amount: number): string {
  if (amount >= 1) {
    return `$${amount.toFixed(2)}`;
  }
  return `$${amount.toFixed(4)}`;
}

function BarChart({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {data.map((item, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "100px", fontSize: "0.75rem", color: "var(--text-dim)" }}>{item.label}</div>
          <div style={{ flex: 1, background: "var(--bg-tertiary)", borderRadius: "0.25rem", height: "20px", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min((item.value / maxValue) * 100, 100)}%`,
                height: "100%",
                background: item.color,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ width: "80px", textAlign: "right", fontSize: "0.75rem", fontWeight: 500 }}>{formatTokens(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

export default function TokensPage() {
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [byModel, setByModel] = useState<ModelUsage[]>([]);
  const [byBuild, setByBuild] = useState<BuildUsage[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const response = await fetch("/api/tokens");
      const result = await response.json();
      if (result.success) {
        setTimeSeries(result.data.timeSeries);
        setByModel(result.data.byModel);
        setByBuild(result.data.byBuild);
        setTotals(result.data.totals);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  const maxTokens = Math.max(...byModel.map((m) => m.input_tokens + m.output_tokens), 1);

  return (
    <>
      <div className="page-header">
        <h2>Token Usage</h2>
        <p>Monitor AI token consumption and costs</p>
      </div>

      {/* Total Stats */}
      {totals && (
        <div className="grid-4" style={{ marginBottom: "1.5rem" }}>
          <div className="card">
            <div className="card-header">Total Tokens</div>
            <div className="stat-value">{formatTokens(totals.total)}</div>
            <div className="stat-label">{formatTokens(totals.input)} in / {formatTokens(totals.output)} out</div>
          </div>
          <div className="card">
            <div className="card-header">Total Cost</div>
            <div className="stat-value">{formatCurrency(totals.cost)}</div>
            <div className="stat-label">avg {formatCurrency(totals.avgCostPerRequest)} / request</div>
          </div>
          <div className="card">
            <div className="card-header">Builds</div>
            <div className="stat-value">{totals.builds}</div>
            <div className="stat-label">total builds tracked</div>
          </div>
          <div className="card">
            <div className="card-header">Requests</div>
            <div className="stat-value">{totals.requests}</div>
            <div className="stat-label">API calls</div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Usage by Model */}
        <div className="card">
          <div className="card-header">Usage by Model</div>
          
          {byModel.length === 0 ? (
            <p style={{ color: "var(--text-dim)", padding: "1rem 0" }}>No token usage data yet.</p>
          ) : (
            <BarChart
              data={byModel.map((m) => ({
                label: m.model,
                value: m.input_tokens + m.output_tokens,
                color: m.model === "opus" ? "#f87171" : m.model === "sonnet" ? "#60a5fa" : "#4ade80",
              }))}
              maxValue={maxTokens}
            />
          )}

          {byModel.length > 0 && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
              <table style={{ width: "100%", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ color: "var(--text-dim)" }}>
                    <th style={{ textAlign: "left" }}>Model</th>
                    <th style={{ textAlign: "right" }}>Cost</th>
                    <th style={{ textAlign: "right" }}>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((m) => (
                    <tr key={m.model}>
                      <td style={{ textTransform: "capitalize" }}>{m.model}</td>
                      <td style={{ textAlign: "right" }}>{formatCurrency(m.cost)}</td>
                      <td style={{ textAlign: "right" }}>{m.requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Build Usage */}
        <div className="card">
          <div className="card-header">Recent Build Usage</div>

          {byBuild.length === 0 ? (
            <p style={{ color: "var(--text-dim)", padding: "1rem 0" }}>No build data available.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {byBuild.map((build) => (
                <div
                  key={build.build_id}
                  style={{
                    padding: "0.75rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "0.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <code className="mono" style={{ fontSize: "0.75rem" }}>{build.build_id.slice(0, 8)}...</code>
                    <span
                      className="badge"
                      style={{
                        background:
                          build.status === "completed"
                            ? "#4ade80"
                            : build.status === "failed"
                            ? "#f87171"
                            : "#fbbf24",
                        color: "#000",
                        fontSize: "0.625rem",
                      }}
                    >
                      {build.status}
                    </span>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-dim)" }}>{formatTokens(build.input_tokens + build.output_tokens)} tokens</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(build.cost)}</span>
                  </div>
                  
                  <div style={{ fontSize: "0.625rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                    {build.task_count} tasks • {new Date(build.started_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Usage Chart */}
      {timeSeries.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="card-header">Daily Usage (Last 30 Days)</div>
          
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "150px", padding: "1rem 0" }}>
            {timeSeries.map((day, index) => {
              const total = day.input_tokens + day.output_tokens;
              const maxDaily = Math.max(...timeSeries.map((d) => d.input_tokens + d.output_tokens));
              const height = maxDaily > 0 ? (total / maxDaily) * 100 : 0;
              
              return (
                <div
                  key={day.date}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title={`${day.date}: ${formatTokens(total)} tokens (${formatCurrency(day.cost)})`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${height}%`,
                      background: "var(--accent)",
                      borderRadius: "2px",
                      minHeight: "4px",
                      opacity: 0.7 + (index / timeSeries.length) * 0.3,
                    }}
                  />
                  <div style={{ fontSize: "0.5rem", color: "var(--text-dim)", transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                    {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
