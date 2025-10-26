'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface EvaluationMetrics {
  overall_score: number;
  coherence_score?: number;
  relevance_score?: number;
  guardrail_score?: number;
}

interface EvaluationRun {
  id: string;
  metrics: EvaluationMetrics;
  guardrail_violations: any;
  sample_size: number;
  created_at: string;
}

interface PromptVersion {
  id: string;
  version: string;
  status: string;
  optimizer_config: any;
  created_at: string;
  updated_at: string;
  evaluation_count: number;
  avg_score: number | null;
  last_evaluation: string | null;
  evaluations: EvaluationRun[];
}

interface TuningResponse {
  data: PromptVersion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function TuningClient() {
  const [tuningData, setTuningData] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const fetchTuningData = async (currentPage: number, statusFilter: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/tuning?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tuning data');
      
      const data: TuningResponse = await response.json();
      setTuningData(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTuningData(page, filter);
  }, [page, filter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-gilded-400 bg-gilded-400/10';
      case 'testing': return 'text-amber-400 bg-amber-400/10';
      case 'failed': return 'text-cardinal-400 bg-cardinal-400/10';
      case 'archived': return 'text-ash-400 bg-ash-400/10';
      default: return 'text-parchment-400 bg-parchment-400/10';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-ash-400';
    if (score >= 0.8) return 'text-gilded-400';
    if (score >= 0.6) return 'text-amber-400';
    return 'text-cardinal-400';
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-ash-950">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-parchment-200">Loading tuning data...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ash-950">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-cardinal-400">Error: {error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ash-950">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-serif text-parchment-50 mb-4">
            DSPy Prompt Tuning Results
          </h1>
          <p className="text-parchment-300 mb-6">
            Monitor prompt optimization experiments and evaluation metrics
          </p>
          
          <div className="flex gap-4 items-center">
            <label className="text-parchment-300">Filter by status:</label>
            <select 
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="bg-ash-900 text-parchment-200 border border-lapis-800 rounded px-3 py-1"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="testing">Testing</option>
              <option value="failed">Failed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </header>

        <div className="space-y-6">
          {tuningData.map((version) => (
            <div key={version.id} className="bg-ash-900 border border-lapis-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-serif text-parchment-50">
                    Version {version.version}
                  </h3>
                  <div className="flex gap-4 mt-2 text-sm text-parchment-400">
                    <span>Created: {formatDate(version.created_at)}</span>
                    {version.last_evaluation && (
                      <span>Last Eval: {formatDate(version.last_evaluation)}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(version.status)}`}>
                    {version.status}
                  </span>
                  {version.avg_score !== null && (
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(version.avg_score)}`}>
                        {(version.avg_score * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-parchment-400">Avg Score</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div className="text-parchment-300">
                  <span className="block font-medium">Evaluations</span>
                  <span className="text-parchment-400">{version.evaluation_count}</span>
                </div>
                <div className="text-parchment-300">
                  <span className="block font-medium">Sample Size</span>
                  <span className="text-parchment-400">
                    {version.evaluations[0]?.sample_size || 'N/A'}
                  </span>
                </div>
                <div className="text-parchment-300">
                  <span className="block font-medium">Optimizer</span>
                  <span className="text-parchment-400">
                    {version.optimizer_config?.optimizer || 'MIPRO'}
                  </span>
                </div>
              </div>

              {version.evaluation_count > 0 && (
                <button
                  onClick={() => setExpandedVersion(expandedVersion === version.id ? null : version.id)}
                  className="text-lapis-400 hover:text-lapis-300 text-sm font-medium mb-2"
                >
                  {expandedVersion === version.id ? 'Hide' : 'Show'} Evaluation Details
                </button>
              )}

              {expandedVersion === version.id && version.evaluations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-lapis-800">
                  <h4 className="font-serif text-parchment-200 mb-3">Evaluation Runs</h4>
                  <div className="space-y-3">
                    {version.evaluations.map((evalRun) => (
                      <div key={evalRun.id} className="bg-ash-950 border border-lapis-700 rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-parchment-400">
                            {formatDate(evalRun.created_at)}
                          </span>
                          {evalRun.metrics.overall_score && (
                            <span className={`text-lg font-bold ${getScoreColor(evalRun.metrics.overall_score)}`}>
                              {(evalRun.metrics.overall_score * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        
                        {evalRun.metrics && (
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-parchment-400">Overall:</span>
                              <span className={`ml-2 font-medium ${getScoreColor(evalRun.metrics.overall_score)}`}>
                                {evalRun.metrics.overall_score ? `${(evalRun.metrics.overall_score * 100).toFixed(1)}%` : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-parchment-400">Coherence:</span>
                              <span className="ml-2 font-medium text-parchment-200">
                                {evalRun.metrics.coherence_score ? `${(evalRun.metrics.coherence_score * 100).toFixed(1)}%` : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-parchment-400">Relevance:</span>
                              <span className="ml-2 font-medium text-parchment-200">
                                {evalRun.metrics.relevance_score ? `${(evalRun.metrics.relevance_score * 100).toFixed(1)}%` : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-parchment-400">Guardrails:</span>
                              <span className="ml-2 font-medium text-parchment-200">
                                {evalRun.metrics.guardrail_score ? `${(evalRun.metrics.guardrail_score * 100).toFixed(1)}%` : 'N/A'}
                              </span>
                            </div>
                          </div>
                        )}

                        {evalRun.guardrail_violations && Object.keys(evalRun.guardrail_violations).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-lapis-800">
                            <span className="text-sm font-medium text-cardinal-400">Guardrail Violations:</span>
                            <div className="mt-1 text-sm text-parchment-300">
                              {JSON.stringify(evalRun.guardrail_violations, null, 2)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-ash-900 text-parchment-200 border border-lapis-800 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ash-800"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-parchment-300">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-ash-900 text-parchment-200 border border-lapis-800 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ash-800"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}