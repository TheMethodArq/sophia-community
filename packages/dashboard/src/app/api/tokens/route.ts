import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();

  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database not available" },
      { status: 500 }
    );
  }

  try {
    // Get token usage over time (by day)
    const timeSeries = db
      .prepare(
        `
        SELECT 
          date(created_at) as date,
          SUM(input_tokens) as input_tokens,
          SUM(output_tokens) as output_tokens,
          SUM(cost) as cost,
          COUNT(DISTINCT build_id) as builds
        FROM token_usage
        WHERE created_at > datetime('now', '-30 days')
        GROUP BY date(created_at)
        ORDER BY date
      `
      )
      .all() as Array<{
        date: string;
        input_tokens: number;
        output_tokens: number;
        cost: number;
        builds: number;
      }>;

    // Get token usage by model
    const byModel = db
      .prepare(
        `
        SELECT 
          model,
          SUM(input_tokens) as input_tokens,
          SUM(output_tokens) as output_tokens,
          SUM(cost) as cost,
          COUNT(*) as requests
        FROM token_usage
        GROUP BY model
      `
      )
      .all() as Array<{
        model: string;
        input_tokens: number;
        output_tokens: number;
        cost: number;
        requests: number;
      }>;

    // Get token usage by build
    const byBuild = db
      .prepare(
        `
        SELECT 
          b.id as build_id,
          b.status,
          b.started_at,
          SUM(t.input_tokens) as input_tokens,
          SUM(t.output_tokens) as output_tokens,
          SUM(t.cost) as cost,
          COUNT(t.id) as task_count
        FROM builds b
        LEFT JOIN token_usage t ON b.id = t.build_id
        GROUP BY b.id
        ORDER BY b.started_at DESC
        LIMIT 10
      `
      )
      .all() as Array<{
        build_id: string;
        status: string;
        started_at: string;
        input_tokens: number;
        output_tokens: number;
        cost: number;
        task_count: number;
      }>;

    // Get total statistics
    const totals = db
      .prepare(
        `
        SELECT 
          SUM(input_tokens) as total_input,
          SUM(output_tokens) as total_output,
          SUM(cost) as total_cost,
          COUNT(DISTINCT build_id) as total_builds,
          COUNT(*) as total_requests,
          AVG(cost) as avg_cost_per_request
        FROM token_usage
      `
      )
      .get() as {
      total_input: number;
      total_output: number;
      total_cost: number;
      total_builds: number;
      total_requests: number;
      avg_cost_per_request: number;
    };

    return NextResponse.json({
      success: true,
      data: {
        timeSeries,
        byModel,
        byBuild,
        totals: {
          input: totals.total_input || 0,
          output: totals.total_output || 0,
          total: (totals.total_input || 0) + (totals.total_output || 0),
          cost: totals.total_cost || 0,
          builds: totals.total_builds || 0,
          requests: totals.total_requests || 0,
          avgCostPerRequest: totals.avg_cost_per_request || 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
