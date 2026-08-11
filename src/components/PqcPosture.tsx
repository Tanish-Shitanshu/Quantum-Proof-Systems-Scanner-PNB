import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Asset = {
  id: string;
  name: string;
  type: string;
  risk?: { risk_level?: string; score?: number; label?: string };
  scan_result?: {
    algorithm?: string;
    key_size?: number;
    tls_version?: string;
    pqc_status?: string;
    days_to_expiry?: number;
  };
};

type RiskSummary = {
  total_assets: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  pqc_readiness_pct: number;
};

const PqcPosture = () => {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<RiskSummary>({
    total_assets: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0,
    pqc_readiness_pct: 0,
  });

  useEffect(() => {
    fetch(apiBase + '/api/assets')
      .then((res) => res.json())
      .then((data) => setAssets(Array.isArray(data) ? data : []))
      .catch(() => setAssets([]));

    fetch(apiBase + '/api/risk')
      .then((res) => res.json())
      .then((data) => {
        if (data?.summary) setSummary(data.summary);
      })
      .catch(() => undefined);
  }, [apiBase]);

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => (Number(a?.risk?.score || 0) - Number(b?.risk?.score || 0)));
  }, [assets]);

  const topRiskAssets = useMemo(() => sortedAssets.slice(0, 10), [sortedAssets]);

  const heatCells = useMemo(() => {
    const maxCells = 32;
    const rows = assets.slice(0, maxCells);
    const cells: string[] = rows.map((asset) => {
      const level = String(asset?.risk?.risk_level || '').toLowerCase();
      if (level.includes('critical') || level.includes('high')) return 'bg-error/70';
      if (level.includes('medium')) return 'bg-secondary-container/70';
      return 'bg-tertiary/50';
    });
    while (cells.length < maxCells) cells.push('bg-surface-container-high/50');
    return cells;
  }, [assets]);

  const readinessPct = Math.max(0, Math.min(100, Number(summary.pqc_readiness_pct || 0)));
  const criticalCount = Number(summary.high_risk || 0);

  return (
    <main className="md:ml-64 pt-24 px-8 pb-12 min-h-screen">
      <header className="mb-8">
        <h2 className="text-[1.75rem] font-bold text-on-surface tracking-tight leading-none mb-1">PQC Posture</h2>
        <p className="text-on-surface-variant text-sm">Live cryptographic readiness derived from current runtime scan results.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 mb-8">
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col justify-between">
          <div>
            <span className="text-[0.6875rem] uppercase tracking-wider font-bold text-on-surface-variant">Fleet Readiness</span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-[3.5rem] font-extrabold text-primary leading-tight">{readinessPct.toFixed(1)}</span>
              <span className="text-xl font-bold text-primary/60">%</span>
            </div>
          </div>
          <div className="mt-8">
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary-container h-full" style={{ width: `${readinessPct}%` }}></div>
            </div>
            <p className="text-[0.6875rem] mt-3 text-on-surface-variant font-medium">Calculated from /api/risk live summary</p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 grid grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
            <span className="text-[0.6875rem] uppercase tracking-wider font-bold text-on-surface-variant block mb-6">Standard</span>
            <span className="text-2xl font-bold text-on-surface">{summary.low_risk}</span>
            <p className="text-xs text-on-surface-variant mt-1">Low Risk</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
            <span className="text-[0.6875rem] uppercase tracking-wider font-bold text-on-surface-variant block mb-6">Legacy</span>
            <span className="text-2xl font-bold text-on-surface">{summary.medium_risk}</span>
            <p className="text-xs text-on-surface-variant mt-1">Medium Risk</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
            <span className="text-[0.6875rem] uppercase tracking-wider font-bold text-on-surface-variant block mb-6">Critical</span>
            <span className="text-2xl font-bold text-error">{criticalCount}</span>
            <p className="text-xs text-on-surface-variant mt-1">High/Critical Risk</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 mb-8">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold uppercase tracking-tight text-on-surface">Risk Heatmap (Live Assets)</h3>
            <span className="px-3 py-1 bg-surface-container-low rounded text-[0.6875rem] font-bold">Assets: {summary.total_assets}</span>
          </div>
          <div className="grid grid-cols-8 grid-rows-4 gap-1">
            {heatCells.map((cell, i) => (
              <div key={i} className={`${cell} rounded-sm h-10`}></div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
          <h3 className="text-sm font-bold uppercase tracking-tight text-on-surface mb-6">Live Recommendations</h3>
          <div className="space-y-4 text-[0.75rem] text-on-surface-variant">
            <p>Prioritize remediation for {criticalCount} high/critical assets.</p>
            <p>Review medium-risk transition backlog: {summary.medium_risk} assets.</p>
            <p>Current PQC readiness is {readinessPct.toFixed(1)}% based on active runtime data.</p>
            <button onClick={() => navigate('/reports')} className="mt-2 text-primary text-[0.625rem] font-extrabold uppercase hover:underline">Open Detailed Reports</button>
          </div>
        </div>
      </div>

      <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
        <div className="px-6 py-5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-tight text-on-surface">Asset Posture Details (Live)</h3>
          <button onClick={() => window.open(apiBase + '/api/assets', '_blank')} className="px-3 py-1.5 text-[0.7rem] font-bold border border-outline-variant/30 rounded hover:bg-surface-container-low transition-colors">Open Raw Assets JSON</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-3 text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">Asset Name</th>
                <th className="px-6 py-3 text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
                <th className="px-6 py-3 text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">Algorithm</th>
                <th className="px-6 py-3 text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">PQC Status</th>
                <th className="px-6 py-3 text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {topRiskAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-sm text-on-surface-variant">No live scan assets yet. Run a scan to populate this screen.</td>
                </tr>
              ) : (
                topRiskAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-[0.8125rem] font-medium text-on-surface">{asset.name}</td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">{asset.type || 'Unknown'}</td>
                    <td className="px-6 py-4 text-xs font-mono">{asset.scan_result?.algorithm || 'Unknown'} {asset.scan_result?.key_size ? `/${asset.scan_result.key_size}` : ''}</td>
                    <td className="px-6 py-4 text-xs font-bold text-on-surface-variant">{asset.scan_result?.pqc_status || asset.risk?.label || 'None'}</td>
                    <td className="px-6 py-4 text-xs font-bold">{asset.risk?.risk_level || 'Unknown'} ({asset.risk?.score ?? 0})</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default PqcPosture;
