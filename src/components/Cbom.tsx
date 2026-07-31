import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

type CbomItem = {
  asset_name?: string;
  cryptography?: Array<{
    id?: string;
    algorithm?: string;
    key_size?: number;
    oid?: string;
    tls_version?: string;
    cipher_suite?: string;
    certificate_issuer?: string;
    state?: string;
    pqc_safe?: boolean;
  }>;
};

type FlatRow = {
  rowId: string;
  assetName: string;
  algorithm: string;
  keySize: string;
  state: string;
  oid: string;
  pqcReady: boolean;
  tlsVersion: string;
  issuer: string;
};

const Cbom = () => {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [cbomData, setCbomData] = useState<CbomItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);

  const loadCbom = () => {
    fetch(apiBase + '/api/cbom')
      .then((res) => res.json())
      .then((data) => setCbomData(Array.isArray(data) ? data : []))
      .catch(() => setCbomData([]));
  };

  useEffect(() => {
    loadCbom();
  }, [apiBase]);

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    cbomData.forEach((item, idx) => {
      const cryptos = Array.isArray(item.cryptography) ? item.cryptography : [];
      cryptos.forEach((c, cidx) => {
        rows.push({
          rowId: c.id || `${idx}-${cidx}`,
          assetName: item.asset_name || 'Unknown Asset',
          algorithm: c.algorithm || 'Unknown',
          keySize: c.key_size ? String(c.key_size) : 'N/A',
          state: c.state || 'active',
          oid: c.oid || 'N/A',
          pqcReady: Boolean(c.pqc_safe),
          tlsVersion: c.tls_version || 'Unknown',
          issuer: c.certificate_issuer || 'Unknown',
        });
      });
    });
    return rows;
  }, [cbomData]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return flatRows;
    return flatRows.filter((row) =>
      row.algorithm.toLowerCase().includes(q) ||
      row.oid.toLowerCase().includes(q) ||
      row.assetName.toLowerCase().includes(q) ||
      row.issuer.toLowerCase().includes(q)
    );
  }, [flatRows, searchTerm]);

  const stats = useMemo(() => {
    const total = flatRows.length;
    const pqcReady = flatRows.filter((r) => r.pqcReady).length;
    const legacy = total - pqcReady;
    const keyBuckets: Record<string, number> = {};
    const algoCounts: Record<string, number> = {};

    flatRows.forEach((r) => {
      keyBuckets[r.keySize] = (keyBuckets[r.keySize] || 0) + 1;
      algoCounts[r.algorithm] = (algoCounts[r.algorithm] || 0) + 1;
    });

    const topAlgos = Object.entries(algoCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, pqcReady, legacy, keyBuckets, topAlgos };
  }, [flatRows]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedRows = filteredRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, flatRows.length]);

  return (
    <main className="md:ml-64 mt-16 p-4 sm:p-6 md:p-8 bg-background min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">CBOM Explorer</h2>
          <p className="text-on-surface-variant mt-1 text-sm max-w-2xl">Live cryptography inventory based on /api/cbom runtime output.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button onClick={() => window.open(apiBase + '/api/cbom', '_blank')} className="px-4 py-2 bg-surface-container-highest text-on-surface text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors w-full sm:w-auto">
            Open Raw CBOM JSON
          </button>
          <button onClick={() => navigate('/scanner')} className="px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white text-sm font-semibold rounded-lg shadow-sm w-full sm:w-auto">
            Run New Scan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 mb-8">
        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <h3 className="text-on-surface-variant font-bold text-[0.6875rem] uppercase tracking-wider mb-4">Live Inventory</h3>
          <p className="text-2xl font-bold text-on-surface">{stats.total}</p>
          <p className="text-xs text-on-surface-variant">Cryptographic entries</p>
        </div>

        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <h3 className="text-on-surface-variant font-bold text-[0.6875rem] uppercase tracking-wider mb-4">PQC Ready</h3>
          <p className="text-2xl font-bold text-tertiary">{stats.pqcReady}</p>
          <p className="text-xs text-on-surface-variant">Entries marked pqc_safe=true</p>
        </div>

        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <h3 className="text-on-surface-variant font-bold text-[0.6875rem] uppercase tracking-wider mb-4">Legacy / Non-PQC</h3>
          <p className="text-2xl font-bold text-error">{stats.legacy}</p>
          <p className="text-xs text-on-surface-variant">Entries requiring migration attention</p>
        </div>
      </div>

      <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-surface-container-low flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h3 className="font-bold text-on-surface text-sm">Algorithm Inventory (Live)</h3>
          <div className="flex items-center bg-surface-container-low rounded px-2 py-1 gap-2 border border-outline-variant/20">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none text-xs focus:ring-0 p-0 w-full sm:w-48 text-on-surface-variant placeholder:text-slate-400 outline-none" placeholder="Filter algorithm/OID/asset/issuer" type="text" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-3 font-bold text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant">Asset</th>
                <th className="px-6 py-3 font-bold text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant">Algorithm</th>
                <th className="px-6 py-3 font-bold text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant">Key Size</th>
                <th className="px-6 py-3 font-bold text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant">OID</th>
                <th className="px-6 py-3 font-bold text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant">TLS</th>
                <th className="px-6 py-3 font-bold text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant text-center">PQC Ready</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {pagedRows.map((row) => (
                <tr key={row.rowId} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-on-surface">{row.assetName}</td>
                  <td className="px-6 py-4 text-xs font-mono text-on-surface">{row.algorithm}</td>
                  <td className="px-6 py-4 text-xs font-mono text-on-surface">{row.keySize}</td>
                  <td className="px-6 py-4 text-[11px] font-mono text-slate-500">{row.oid}</td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant">{row.tlsVersion}</td>
                  <td className="px-6 py-4 text-center">
                    {row.pqcReady ? (
                      <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    ) : (
                      <span className="material-symbols-outlined text-error">dangerous</span>
                    )}
                  </td>
                </tr>
              ))}
              {pagedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant text-sm">No live CBOM data found. Run a scan first.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-surface-container-low flex items-center justify-between text-xs text-on-surface-variant font-medium">
          <p>Showing {pagedRows.length} of {filteredRows.length} entries</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((prev) => Math.max(0, prev - 1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high disabled:opacity-30" disabled={currentPage === 0}>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white font-bold">{currentPage + 1}</button>
            <button onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high disabled:opacity-30" disabled={currentPage >= totalPages - 1}>
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Cbom;
