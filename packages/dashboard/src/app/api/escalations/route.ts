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
    // Get pending actions that require human approval
    const pendingActions = db
      .prepare(
        `
        SELECT 
          a.id,
          a.build_id,
          a.task_id,
          a.action_type,
          a.classification,
          a.status,
          a.created_at,
          b.project_path,
          b.plan_path
        FROM actions a
        JOIN builds b ON a.build_id = b.id
        WHERE a.status = 'pending'
        ORDER BY a.created_at DESC
      `
      )
      .all() as Array<{
        id: number;
        build_id: string;
        task_id: string;
        action_type: string;
        classification: string;
        status: string;
        created_at: string;
        project_path: string;
        plan_path: string | null;
      }>;

    // Get escalations (actions with high risk)
    const escalations = db
      .prepare(
        `
        SELECT 
          a.id,
          a.build_id,
          a.task_id,
          a.action_type,
          a.classification,
          a.status,
          a.created_at,
          b.project_path,
          CASE 
            WHEN a.action_type IN ('file_delete', 'command_exec') THEN 'high'
            WHEN a.action_type IN ('dependency_add', 'config_change') THEN 'medium'
            ELSE 'low'
          END as severity
        FROM actions a
        JOIN builds b ON a.build_id = b.id
        WHERE a.classification = 'human_required'
        AND a.status = 'pending'
        ORDER BY 
          CASE 
            WHEN a.action_type IN ('file_delete', 'command_exec') THEN 1
            WHEN a.action_type IN ('dependency_add', 'config_change') THEN 2
            ELSE 3
          END,
          a.created_at DESC
      `
      )
      .all() as Array<{
        id: number;
        build_id: string;
        task_id: string;
        action_type: string;
        classification: string;
        status: string;
        created_at: string;
        project_path: string;
        severity: "low" | "medium" | "high";
      }>;

    // Get recent decisions (approved/rejected)
    const recentDecisions = db
      .prepare(
        `
        SELECT 
          a.id,
          a.build_id,
          a.task_id,
          a.action_type,
          a.status,
          a.resolved_at,
          b.project_path
        FROM actions a
        JOIN builds b ON a.build_id = b.id
        WHERE a.status IN ('approved', 'rejected', 'auto_approved')
        ORDER BY a.resolved_at DESC
        LIMIT 20
      `
      )
      .all() as Array<{
        id: number;
        build_id: string;
        task_id: string;
        action_type: string;
        status: string;
        resolved_at: string;
        project_path: string;
      }>;

    // Get action statistics
    const stats = db
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

    const statsMap = stats.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        pendingActions,
        escalations,
        recentDecisions,
        stats: {
          pending: statsMap["pending"] || 0,
          approved: statsMap["approved"] || 0,
          rejected: statsMap["rejected"] || 0,
          autoApproved: statsMap["auto_approved"] || 0,
          total: stats.reduce((sum, s) => sum + s.count, 0),
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

export async function POST(request: Request) {
  const db = getDb();

  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database not available" },
      { status: 500 }
    );
  }

  try {
    const { actionId, decision, reason } = await request.json();

    if (!actionId || !decision) {
      return NextResponse.json(
        { success: false, error: "Missing actionId or decision" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { success: false, error: "Decision must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Update action status
    const stmt = db.prepare(`
      UPDATE actions 
      SET status = ?, resolved_at = ?
      WHERE id = ? AND status = 'pending'
    `);

    const result = stmt.run(decision, new Date().toISOString(), actionId);

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: "Action not found or already resolved" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        actionId,
        decision,
        reason,
        resolvedAt: new Date().toISOString(),
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
