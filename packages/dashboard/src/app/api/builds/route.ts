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
    // Get all builds
    const builds = db
      .prepare(
        `
        SELECT 
          id,
          project_path,
          plan_path,
          status,
          current_sprint,
          current_task,
          started_at,
          completed_at,
          error
        FROM builds
        ORDER BY created_at DESC
        LIMIT 10
      `
      )
      .all() as Array<{
        id: string;
        project_path: string;
        plan_path: string | null;
        status: string;
        current_sprint: number;
        current_task: number;
        started_at: string;
        completed_at: string | null;
        error: string | null;
      }>;

    // Get token usage for each build
    const buildsWithTokens = builds.map((build) => {
      const tokenUsage = db
        .prepare(
          `
          SELECT 
            COALESCE(SUM(input_tokens), 0) as input,
            COALESCE(SUM(output_tokens), 0) as output,
            COALESCE(SUM(cost), 0) as cost
          FROM token_usage
          WHERE build_id = ?
        `
        )
        .get(build.id) as { input: number; output: number; cost: number };

      return {
        ...build,
        tokenUsage: {
          input: tokenUsage.input,
          output: tokenUsage.output,
          total: tokenUsage.input + tokenUsage.output,
          cost: tokenUsage.cost,
        },
      };
    });

    // Get active builds
    const activeBuilds = buildsWithTokens.filter(
      (b) => b.status === "running" || b.status === "pending"
    );

    // Get total token usage across all builds
    const totalTokens = db
      .prepare(
        `
        SELECT 
          COALESCE(SUM(input_tokens + output_tokens), 0) as total,
          COALESCE(SUM(cost), 0) as cost
        FROM token_usage
      `
      )
      .get() as { total: number; cost: number };

    // Get checkpoints count
    const checkpointsCount = db
      .prepare(`SELECT COUNT(*) as count FROM checkpoints`)
      .get() as { count: number };

    // Get actions count by status
    const actionsCount = db
      .prepare(
        `
        SELECT 
          status,
          COUNT(*) as count
        FROM actions
        GROUP BY status
      `
      )
      .all() as Array<{ status: string; count: number }>;

    return NextResponse.json({
      success: true,
      data: {
        builds: buildsWithTokens,
        activeBuilds: activeBuilds.length,
        totalBuilds: builds.length,
        totalTokens,
        checkpointsCount: checkpointsCount.count,
        actionsCount: actionsCount.reduce((acc, curr) => {
          acc[curr.status] = curr.count;
          return acc;
        }, {} as Record<string, number>),
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
