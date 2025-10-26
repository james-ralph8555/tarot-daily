import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/server/db';
import { duckDbTables } from '@daily-tarot/common';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    let whereClause = '';
    const params: any[] = [];

    if (status) {
      whereClause = 'WHERE CASE WHEN pv.active THEN \'candidate\' ELSE \'draft\' END = $1';
      params.push(status);
    }

    const offset = (page - 1) * limit;

    // Get prompt versions with evaluation metrics using the correct table names
    const promptVersions = await query<any>(`
      SELECT 
        pv.id,
        pv.prompt as version,
        CASE WHEN pv.active THEN 'candidate' ELSE 'draft' END as status,
        null as optimizer_config,
        pv.created_at,
        null as updated_at,
        COUNT(er.id) as evaluation_count,
        AVG((er.metrics->>'overall_score')::FLOAT) as avg_score,
        MAX(er.created_at) as last_evaluation
      FROM ${duckDbTables.prompts} pv
      LEFT JOIN ${duckDbTables.evaluations} er ON pv.id = er.prompt_version
      ${whereClause}
      GROUP BY pv.id, pv.prompt, pv.active, pv.created_at
      ORDER BY pv.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, { params: [...params, limit, offset] });

    // Get total count for pagination
    const totalResult = await query<{ total: number }>(`
      SELECT COUNT(*) as total FROM ${duckDbTables.prompts} pv
      ${whereClause}
    `, { params });

    // Get detailed evaluation runs for each prompt version
    const detailedResults = await Promise.all(
      promptVersions.map(async (version: any) => {
        const evaluations = await query<any>(`
          SELECT 
            id,
            metrics,
            null as guardrail_violations,
            0 as sample_size,
            created_at
          FROM ${duckDbTables.evaluations}
          WHERE prompt_version = $1
          ORDER BY created_at DESC
        `, { params: [version.id] });

        return {
          ...version,
          evaluations
        };
      })
    );

    return NextResponse.json({
      data: detailedResults,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.total || 0,
        totalPages: Math.ceil((totalResult[0]?.total || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch tuning results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tuning results' },
      { status: 500 }
    );
  }
}