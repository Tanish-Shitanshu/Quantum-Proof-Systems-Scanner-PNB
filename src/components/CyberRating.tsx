import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Asset = {
  id: string;
  name: string;
  ip_address?: string;
  risk?: { risk_level?: string; score?: number };
  scan_result?: { algorithm?: string; tls_version?: string };
};

const CyberRating = () => {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vulnerableAssets, setVulnerableAssets] = useState<Asset[]>([]);

  useEffect(() => {
    fetch(apiBase + '/api/assets')
      .then((res) => res.json())
      .then((data) => setAssets(Array.isArray(data) ? data : []))
      .catch(() => setAssets([]));

    fetch(apiBase + '/api/vulnerable-assets')
      .then((res) => res.json())
      .then((data) => setVulnerableAssets(Array.isArray(data) ? data : []))
      .catch(() => setVulnerableAssets([]));
  }, [apiBase]);

  const metrics = useMemo(() => {
    const total = assets.length;
    const low = assets.filter((a) => String(a?.risk?.risk_level || '').toLowerCase() === 'low').length;
    const medium = assets.filter((a) => String(a?.risk?.risk_level || '').toLowerCase() === 'medium').length;
    const high = assets.filter((a) => {
      const lvl = String(a?.risk?.risk_level || '').toLowerCase();
      return lvl === 'high' || lvl === 'critical';
    }).length;

    const avgScore = total > 0
      ? assets.reduce((sum, a) => sum + Number(a?.risk?.score || 0), 0) / total
      : 0;

    return {
      total,
      low,
      medium,
      high,
      rating1000: Math.round((avgScore / 100) * 1000),
      safePct: total > 0 ? Math.round((low / total) * 100) : 0,
    };
  }, [assets]);

  const topRisk = useMemo(() => {
    return [...assets]
      .sort((a, b) => Number(a?.risk?.score || 0) - Number(b?.risk?.score || 0))
      .slice(0, 12);
  }, [assets]);

  return (
    <main className="md:ml-64 pt-24 pb-12 px-10 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0 mb-10">
        <div>
          <h2 className="text-[1.75rem] font-bold text-on-surface tracking-tight leading-none mb-2">Cyber Rating</h2>
          <p className="text-on-surface-variant text-sm max-w-xl">Live cryptographic health rating based only on current runtime asset risk data.</p>
        </div>
        <button
          onClick={() => window.open(apiBase + '/api/reports/download?x_user_role=Super%20Admin', '_blank')}
          className="bg-surface-container-highest text-on-surface px-6 py-2 rounded-lg text-sm font-semibold hover:bg-surface-variant transition-colors shadow-sm"
        >
          Export Executive Summary
        </button>
      </div>

      {vulnerableAssets.length > 0 && (
        <div className="mb-8 bg-error/10 border border-error/30 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-error/20 flex justify-between items-center bg-error/5">
            <h3 className="text-sm font-bold text-error uppercase tracking-wider">Critical Vulnerabilities Detected ({vulnerableAssets.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-error/5">
                  <th className="px-6 py-3 text-[10px] text-error font-bold uppercase tracking-widest">Target / Asset</th>
                  <th className="px-6 py-3 text-[10px] text-error font-bold uppercase tracking-widest">Algorithm</th>
                  <th className="px-6 py-3 text-[10px] text-error font-bold uppercase tracking-widest">TLS Version</th>
                  <th className="px-6 py-3 text-[10px] text-error font-bold uppercase tracking-widest text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-error/10">
                {vulnerableAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-error/10 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-on-surface">{asset.name}</td>
                    <td className="px-6 py-4 text-xs font-mono text-error">{asset.scan_result?.algorithm || 'Unknown'}</td>
                    <td className="px-6 py-4 text-xs">{asset.scan_result?.tls_version || 'Unknown'}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold">{asset.risk?.risk_level || 'High'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8 mb-8">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle className="opacity-50" cx="128" cy="128" fill="none" r="110" stroke="#eceef0" strokeWidth="16"></circle>
                <circle
                  cx="128"
                  cy="128"
                  fill="none"
                  r="110"
                  stroke="url(#score-grad-live)"
                  strokeDasharray="690"
                  strokeDashoffset={690 - Math.round((Math.max(0, Math.min(1000, metrics.rating1000)) / 1000) * 690)}
                  strokeLinecap="round"
                  strokeWidth="16"
                ></circle>
                <defs>
                  <linearGradient id="score-grad-live" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#ba1a1a"></stop>
                    <stop offset="50%" stopColor="#2170e4"></stop>
                    <stop offset="100%" stopColor="#006645"></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-5xl font-extrabold text-on-surface">{metrics.rating1000}</span>
                <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-widest mt-1">Live Score / 1000</span>
              </div>
            </div>

            <div className="flex-1 w-full">
              <h3 className="text-sm font-bold text-on-surface mb-4 uppercase tracking-wider">Current Runtime Snapshot</h3>
              <div className="space-y-3 text-sm">
                <p>Total Assets: <b>{metrics.total}</b></p>
                <p>Low Risk: <b>{metrics.low}</b></p>
                <p>Medium Risk: <b>{metrics.medium}</b></p>
                <p>High/Critical Risk: <b>{metrics.high}</b></p>
                <p>Safe Ratio: <b>{metrics.safePct}%</b></p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10">
            <h3 className="text-[11px] font-bold text-on-surface-variant mb-4 uppercase tracking-widest">Benchmark Context</h3>
            <p className="text-xs text-on-surface-variant">No fixed external benchmark values are hardcoded here. This panel reflects only your live environment totals and risk composition.</p>
          </div>
          <div className="bg-primary text-white rounded-xl p-6 shadow-lg shadow-primary/20 bg-gradient-to-br from-primary to-primary-container">
            <p className="text-sm font-medium leading-relaxed">Immediate uplift opportunity: reduce the {metrics.high} high/critical assets to increase the live score in this environment.</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
        <div className="p-6 border-b border-surface-container-low flex justify-between items-center">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Asset Vulnerability Matrix (Live)</h3>
          <button onClick={() => navigate('/asset-inventory')} className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter hover:text-primary">Open Inventory</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-4 text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">Target URL / Asset</th>
                <th className="px-6 py-4 text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">Algorithm</th>
                <th className="px-6 py-4 text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">PQC Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {topRisk.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-sm text-on-surface-variant">No live scan records available yet.</td>
                </tr>
              ) : (
                topRisk.map((asset) => (
                  <tr key={asset.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-on-surface">{asset.name}</td>
                    <td className="px-6 py-4 text-xs font-mono">{asset.scan_result?.algorithm || 'Unknown'}</td>
                    <td className="px-6 py-4 text-xs font-bold uppercase">{asset.risk?.risk_level || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm font-bold">{Math.round((Number(asset.risk?.score || 0) / 100) * 1000)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default CyberRating;
