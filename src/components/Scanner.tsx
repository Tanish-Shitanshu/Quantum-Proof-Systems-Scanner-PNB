import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hasPermission } from './Settings';

const Scanner = () => {
  const [searchParams] = useSearchParams();
  const [target, setTarget] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bucketFilter, setBucketFilter] = useState<'all' | 'pqc_ready' | 'standard' | 'critical'>('all');
  const [subdomainQuery, setSubdomainQuery] = useState('');
  const [subdomainPage, setSubdomainPage] = useState(0);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState('mon');
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1);
  const [scheduleEmail, setScheduleEmail] = useState(localStorage.getItem('userEmail') || 'admin@quantumshield.local');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scanMode, setScanMode] = useState<'Full Deep Scan' | 'Quick Scan'>('Full Deep Scan');
  const role = localStorage.getItem('userRole') || 'User';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const SCAN_JOB_STORAGE_KEY = 'scannerPendingJobId';
  const SCAN_DOMAIN_STORAGE_KEY = 'scannerPendingDomain';
  const [scanJobId, setScanJobId] = useState<string | null>(() => localStorage.getItem(SCAN_JOB_STORAGE_KEY));

  const loadAssetById = useCallback(async (assetId: string) => {
    const res = await fetch(`${apiBase}/api/assets/${encodeURIComponent(assetId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setScanResult(data);
    if (data?.name) {
      setTarget(data.name);
      localStorage.setItem('lastScanDomain', data.name);
    }
    if (data?.id) {
      localStorage.setItem('lastScanAssetId', String(data.id));
    }
  }, [apiBase]);

  useEffect(() => {
    const initialAssetId = searchParams.get('assetId') || localStorage.getItem('lastScanAssetId');
    const initialDomain = searchParams.get('domain') || localStorage.getItem('lastScanDomain');

    if (initialAssetId) {
      loadAssetById(initialAssetId).catch(() => undefined);
      return;
    }

    if (!initialDomain) return;
    setTarget(initialDomain);
    fetch(`${apiBase}/api/reports/website?domain=${encodeURIComponent(initialDomain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.website) {
          setScanResult(payload.website);
        }
      })
      .catch(() => undefined);
  }, [apiBase, searchParams]);

  useEffect(() => {
    // Debounce: don't fire on every keystroke; wait 600 ms after user stops typing.
    const debounceTimer = window.setTimeout(() => {
      const trimmed = target.trim();
      const endpoint = trimmed && trimmed.includes('.')
        ? `${apiBase}/api/reports/history?domain=${encodeURIComponent(trimmed)}&limit=200`
        : `${apiBase}/api/reports/history?limit=200`;

      setHistoryLoading(true);
      fetch(endpoint, {
        headers: { 'x-user-role': role },
      })
        .then(async (res) => {
          if (!res.ok) { setScanHistory([]); return; }
          const data = await res.json();
          setScanHistory(Array.isArray(data?.data) ? data.data : []);
        })
        .catch(() => setScanHistory([]))
        .finally(() => setHistoryLoading(false));
    }, 600);
    return () => window.clearTimeout(debounceTimer);
  }, [apiBase, role, target]);

  const orderedHistory = useMemo(() => {
    return [...scanHistory].sort((a: any, b: any) => {
      const tA = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tB - tA;
    });
  }, [scanHistory]);

  const topHistoryEntries = useMemo(() => orderedHistory.slice(0, 4), [orderedHistory]);

  const archivedHistoryByMonth = useMemo(() => {
    const rows = orderedHistory.slice(4);
    const groups: Record<string, { label: string; rows: any[] }> = {};
    for (const row of rows) {
      const raw = row?.timestamp ? new Date(row.timestamp) : null;
      const dt = raw && !Number.isNaN(raw.getTime()) ? raw : new Date(0);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = {
          label: dt.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
          rows: [],
        };
      }
      groups[key].rows.push(row);
    }
    return Object.values(groups);
  }, [orderedHistory]);

  useEffect(() => {
    if (!scanJobId) return;

    // Discard jobs that were stored in a previous session (older than 2 hours).
    const storedJobAge = localStorage.getItem('scannerPendingJobStartTime');
    if (storedJobAge) {
      const ageMs = Date.now() - Number(storedJobAge);
      if (ageMs > 2 * 60 * 60 * 1000) {
        setScanJobId(null);
        localStorage.removeItem(SCAN_JOB_STORAGE_KEY);
        localStorage.removeItem(SCAN_DOMAIN_STORAGE_KEY);
        localStorage.removeItem('scannerPendingJobStartTime');
        return;
      }
    }

    let cancelled = false;
    let timerId: number | undefined;
    setIsScanning(true);

    const pollJob = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${apiBase}/api/scan/jobs/${encodeURIComponent(scanJobId)}`);
        if (!res.ok) {
          throw new Error(`Unable to read scan job status (${res.status})`);
        }
        const job = await res.json();
        const status = String(job?.status || '').toLowerCase();

        if (status === 'completed') {
          setIsScanning(false);
          setScanJobId(null);
          localStorage.removeItem(SCAN_JOB_STORAGE_KEY);
          localStorage.removeItem(SCAN_DOMAIN_STORAGE_KEY);

          if (job?.result_asset_id) {
            await loadAssetById(String(job.result_asset_id));
          }

          const completedDomain = job?.domain || target.trim();
          setToastMsg(`Scan Completed: ${completedDomain || 'target'}`);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
          return;
        }

        if (status === 'failed') {
          setIsScanning(false);
          setScanJobId(null);
          localStorage.removeItem(SCAN_JOB_STORAGE_KEY);
          localStorage.removeItem(SCAN_DOMAIN_STORAGE_KEY);
          setToastMsg(`Scan failed: ${job?.error || 'Unknown backend error'}`);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
          return;
        }

        timerId = window.setTimeout(pollJob, 2500);
      } catch {
        timerId = window.setTimeout(pollJob, 3000);
      }
    };

    pollJob();

    return () => {
      cancelled = true;
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [apiBase, loadAssetById, scanJobId, target]);

  const mobileApps = useMemo(() => scanResult?.scan_result?.mobile_info?.apps || [], [scanResult]);
  const topMobileMatch = scanResult?.scan_result?.mobile_info?.most_relevant_app;

  const keyExchangeLabel = useMemo(() => {
    const kem = scanResult?.scan_result?.pqc_kem_algorithm;
    if (!kem) return scanResult?.scan_result?.algorithm || '---';
    if (String(kem).toUpperCase().includes('MLKEM')) {
      return `${kem} (Kyber Family)`;
    }
    return kem;
  }, [scanResult]);

  const scanPerformance = useMemo(() => {
    const result = scanResult?.scan_result || {};
    const responseMs = Number(result?.response_time_ms || 0);
    const shownDuration = responseMs > 0 ? `${(responseMs / 1000).toFixed(2)}s` : (scanResult ? 'N/A' : '---');
    const subdomainCount = Number(result?.all_subdomains_detailed?.length || 0);
    const vulnTargets = Number(result?.vulnerability_scan?.scan_targets || 0);
    return {
      duration: shownDuration,
      payloads: subdomainCount + vulnTargets,
    };
  }, [scanResult]);

  const riskWeights = scanResult?.risk?.weights || {
    kem: 0.35,
    cert_algo: 0.25,
    protocol: 0.15,
    cert_health: 0.10,
    vulnerability: 0.10,
    exposure: 0.05,
  };

  const riskComponents = scanResult?.risk?.components || {
    kem: 0,
    cert_algo: 0,
    protocol: 0,
    cert_health: 0,
    vulnerability: 0,
    exposure: 0,
  };

  const riskRows = [
    { key: 'kem', label: 'KEM / Key Exchange' },
    { key: 'cert_algo', label: 'Certificate Algo' },
    { key: 'protocol', label: 'Protocol' },
    { key: 'cert_health', label: 'Cert Health' },
    { key: 'vulnerability', label: 'Vulnerability' },
    { key: 'exposure', label: 'Exposure' },
  ];

  const riskContributionRows = riskRows.map((row) => {
    const factorValue = Number(riskComponents?.[row.key] || 0);
    const weight = Number(riskWeights?.[row.key] || 0);
    return {
      ...row,
      factorValue,
      weight,
      contribution: Number((factorValue * weight).toFixed(2)),
    };
  });

  const computedPenalty = Number(
    riskContributionRows.reduce((sum, row) => sum + row.contribution, 0).toFixed(2)
  );

  const subdomainRows = useMemo(() => {
    const rows = scanResult?.scan_result?.all_subdomains_detailed || [];
    return rows.map((row: any) => {
      const days = row?.days_to_expiry;
      let bucket = 'critical';
      if (typeof days === 'number' && days > 180) bucket = 'pqc_ready';
      else if (typeof days === 'number' && days > 90) bucket = 'standard';

      return {
        ...row,
        bucket,
      };
    });
  }, [scanResult]);

  const filteredSubdomainRows = useMemo(() => {
    return subdomainRows.filter((row: any) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesBucket = bucketFilter === 'all' || row.bucket === bucketFilter;
      const matchesQuery = !subdomainQuery.trim() || String(row.subdomain || '').toLowerCase().includes(subdomainQuery.toLowerCase());
      return matchesStatus && matchesBucket && matchesQuery;
    });
  }, [subdomainRows, statusFilter, bucketFilter, subdomainQuery]);

  const subdomainPageSize = 10;
  const subdomainPageCount = Math.max(1, Math.ceil(filteredSubdomainRows.length / subdomainPageSize));
  const pagedSubdomainRows = useMemo(() => {
    const start = subdomainPage * subdomainPageSize;
    return filteredSubdomainRows.slice(start, start + subdomainPageSize);
  }, [filteredSubdomainRows, subdomainPage]);

  useEffect(() => {
    setSubdomainPage(0);
  }, [scanResult, statusFilter, bucketFilter, subdomainQuery]);



  const handshakeStatus = useMemo(() => {
    const discovery = scanResult?.scan_result?.subdomains_discovery;
    const mainProbe = discovery?.main_domain;
    const rootProbe = discovery?.main_domain_probe;

    if (!scanResult) {
      return {
        label: 'TLS handshake not started',
        detail: 'Run a scan to probe TLS handshake status',
        dotClass: 'bg-slate-400',
      };
    }

    if (mainProbe?.connection_successful) {
      const endpoint = mainProbe?.resolved_from || scanResult?.name || 'target host';
      return {
        label: 'TLS handshake successful',
        detail: `Endpoint: ${endpoint}`,
        dotClass: 'bg-emerald-500',
      };
    }

    const errorMsg = mainProbe?.error || rootProbe?.error || 'Handshake failed or timed out';
    return {
      label: 'TLS handshake attempted but failed',
      detail: errorMsg,
      dotClass: 'bg-red-500',
    };
  }, [scanResult]);

  const handleScan = async () => {
    if (!target) return;
    try {
      const domainToScan = target.trim();
      setIsScanning(true);
      const res = await fetch(apiBase + '/api/scan/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role
        },
        body: JSON.stringify({ domain: domainToScan, mode: scanMode })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || `Scan request failed with status ${res.status}`);
      }

      if (!data?.job_id) {
        throw new Error('Scan job was created without a job id');
      }

      setScanJobId(String(data.job_id));
      localStorage.setItem(SCAN_JOB_STORAGE_KEY, String(data.job_id));
      localStorage.setItem(SCAN_DOMAIN_STORAGE_KEY, domainToScan);
      localStorage.setItem('lastScanDomain', domainToScan);
      localStorage.setItem('scannerPendingJobStartTime', String(Date.now()));

      setToastMsg(`Scan queued: ${domainToScan}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err: any) {
      console.error("Scan request error", err);
      const errorMessage = err?.message || 'Unable to reach scanner service';
      setToastMsg(`Unable to complete scan for ${target}: ${errorMessage}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      setIsScanning(false);
    }
  };

  const handleSchedule = async () => {
    if (!target.trim()) {
      setToastMsg('Enter target domain before scheduling scans.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }

    setIsScheduling(true);
    try {
      const res = await fetch(apiBase + '/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
        body: JSON.stringify({
          frequency: scheduleFrequency,
          time: scheduleTime,
          domain: target.trim(),
          email: scheduleEmail.trim() || 'admin@quantumshield.local',
          day_of_week: scheduleFrequency === 'weekly' ? scheduleDayOfWeek : null,
          day_of_month: scheduleFrequency === 'monthly' ? scheduleDayOfMonth : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || 'Scheduling failed');
      }

      const nextRun = data?.next_run_time ? ` Next run: ${data.next_run_time}` : '';
      setToastMsg(`Auto schedule created for ${target.trim()} (${scheduleFrequency}).${nextRun}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err: any) {
      setToastMsg(`Scheduling failed: ${err?.message || 'Unknown error'}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsScheduling(false);
    }
  };
  return (
    <main className="md:ml-64 pt-24 pb-12 px-8 min-h-screen scanner-scope">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight">Quantum Vulnerability Scanner</h2>
              <a href="https://csrc.nist.gov/Projects/post-quantum-cryptography" target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors group relative cursor-pointer" title="NIST PQC Standards">
                <span className="material-symbols-outlined text-[14px]">info</span>
              </a>
            </div>
            <p className="text-on-surface-variant mt-2 max-w-xl">Initiate comprehensive cryptographic audits to identify legacy algorithms vulnerable to Shor's algorithm and ensure PQC compliance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!target.trim()) {
                  alert('Enter a domain first to export its website report.');
                  return;
                }
                window.open(`${apiBase}/api/reports/website/download?domain=${encodeURIComponent(target.trim())}&x_user_role=${encodeURIComponent(role)}`);
              }}
              className="px-5 py-2.5 bg-surface-container-highest text-on-surface rounded font-semibold text-sm transition-all hover:bg-surface-dim w-full sm:w-auto"
            >
              Website Report
            </button>
            <button
              onClick={() => {
                if (role !== 'Super Admin') {
                  alert('Only Super Admin can export the full CISO PDF report.');
                  return;
                }
                window.open(`${apiBase}/api/reports/download?x_user_role=${encodeURIComponent(role)}`);
              }}
              className="px-5 py-2.5 bg-surface-container-highest text-on-surface rounded font-semibold text-sm transition-all hover:bg-surface-dim w-full sm:w-auto"
            >
              Export Report
            </button>
            <div className="flex flex-col items-end gap-1">
              {isScanning && scanJobId && (
                <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                  Job running — safe to navigate away
                </span>
              )}
              <button
                onClick={isScanning ? undefined : handleScan}
                disabled={isScanning}
                className={`px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-white rounded font-bold text-sm shadow-sm flex items-center gap-2 transition-all ${isScanning ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className={`material-symbols-outlined text-sm flex items-center ${isScanning ? 'animate-spin' : ''}`}>{isScanning ? 'sync' : 'play_arrow'}</span>
                {isScanning ? 'Scanning...' : 'Start Scan'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Input & Scanning Section */}
          <section className="col-span-12 lg:col-span-8 space-y-8">
            {/* Search/Input Area */}
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant mb-4">Target Specification</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-4 flex items-center text-primary">
                    <span className="material-symbols-outlined flex items-center">language</span>
                  </span>
                  <input 
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-lg py-4 pl-12 pr-4 text-on-surface font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                    placeholder="Enter Domain or IP Address" 
                    type="text" 
                  />
                </div>
                <select
                  value={scanMode}
                  onChange={(e) => setScanMode(e.target.value as 'Full Deep Scan' | 'Quick Scan')}
                  className="bg-surface-container-low rounded-lg py-4 px-4 text-sm font-bold text-on-surface-variant w-full sm:w-auto border border-outline-variant/20 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Full Deep Scan">Full Deep Scan</option>
                  <option value="Quick Scan">Quick Scan</option>
                </select>
              </div>

              <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface-container-low p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[0.625rem] uppercase font-bold tracking-wider text-on-surface-variant">Previous Scan Results</p>
                  {historyLoading && <span className="text-[10px] text-on-surface-variant">Loading...</span>}
                </div>
                {!hasPermission('can_view_history') ? (
                  <p className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    History access restricted by your role. Contact Super Admin.
                  </p>
                ) : (
                <>{scanHistory.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    {target.trim() ? 'No saved scans found for this domain yet.' : 'No saved scans found yet.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-2">Top Recent (4)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {topHistoryEntries.map((row: any) => {
                          const ts = row?.timestamp ? new Date(row.timestamp) : null;
                          const validTs = ts && !Number.isNaN(ts.getTime());
                          const title = `${row?.domain || 'Unknown Domain'} • ${validTs ? ts.toLocaleString() : (row?.report_id || 'Unknown Time')}`;
                          return (
                            <button
                              key={row.asset_id || row.report_id}
                              onClick={() => row.asset_id && loadAssetById(String(row.asset_id))}
                              className="text-left rounded-md bg-surface-container-highest px-3 py-2 hover:bg-surface-container-high transition-colors"
                            >
                              <p className="text-xs font-semibold text-on-surface truncate" title={title}>{title}</p>
                              <p className="text-[11px] text-on-surface-variant">{row.risk_level} • Score {row.score} • {row.algorithm || 'N/A'}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {archivedHistoryByMonth.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-2">Archive By Month</p>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {archivedHistoryByMonth.map((group, idx) => (
                            <details key={`${group.label}-${idx}`} className="rounded-md border border-outline-variant/20 bg-surface-container-highest px-3 py-2" open={idx === 0}>
                              <summary className="cursor-pointer text-xs font-bold text-on-surface flex items-center justify-between">
                                <span>{group.label}</span>
                                <span className="text-[10px] text-on-surface-variant">{group.rows.length} scans</span>
                              </summary>
                              <div className="mt-2 grid grid-cols-1 gap-2">
                                {group.rows.map((row: any) => {
                                  const ts = row?.timestamp ? new Date(row.timestamp) : null;
                                  const validTs = ts && !Number.isNaN(ts.getTime());
                                  const dayLabel = validTs ? ts.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date';
                                  const timeLabel = validTs ? ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time';
                                  return (
                                    <button
                                      key={row.asset_id || row.report_id}
                                      onClick={() => row.asset_id && loadAssetById(String(row.asset_id))}
                                      className="text-left rounded bg-surface-container-low px-3 py-2 hover:bg-surface-container transition-colors"
                                    >
                                      <p className="text-xs font-semibold text-on-surface truncate">{row?.domain || 'Unknown Domain'}</p>
                                      <p className="text-[11px] text-on-surface-variant">{dayLabel} • {timeLabel} • {row.risk_level} • Score {row.score}</p>
                                    </button>
                                  );
                                })}
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </>)}
              </div>
            </div>

            {/* Results Panel */}
            <div className={`bg-surface-container-lowest rounded-xl p-8 shadow-sm ${!scanResult && !isScanning ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Live Analysis Results</h3>
                <div className="flex items-center gap-2 text-[0.6875rem] font-bold py-1 px-3 bg-tertiary/10 text-tertiary rounded-full uppercase">
                  <span className={`w-1.5 h-1.5 bg-tertiary rounded-full ${isScanning ? 'animate-pulse' : ''}`}></span>
                  {isScanning ? 'Scanning...' : scanResult ? 'Analysis Complete' : 'Waiting for Input'}
                </div>
              </div>
              {(scanResult?.name || (isScanning && target)) && (
                <div className="mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">language</span>
                  <span className="text-lg font-bold text-on-surface tracking-tight">{scanResult?.name || target}</span>
                  {scanResult?.scan_result?.ipv4 && scanResult.scan_result.ipv4 !== '0.0.0.0' && (
                    <span className="text-[11px] text-on-surface-variant font-mono bg-surface-container-highest px-2 py-0.5 rounded">{scanResult.scan_result.ipv4}</span>
                  )}
                </div>
              )}

              <div className="mb-6 flex items-start gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
                <span className={`mt-1 h-2 w-2 rounded-full ${handshakeStatus.dotClass}`}></span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">{handshakeStatus.label}</p>
                  <p className="text-[0.6875rem] text-on-surface-variant break-words">{handshakeStatus.detail}</p>
                </div>
              </div>

              {/* Scan Metrics Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* TLS Version */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Protocol</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-on-surface">
                      {(() => {
                        const list: string[] = scanResult?.scan_result?.tls_versions_list || [];
                        if (list.length > 1) return list.join(' + ');
                        return scanResult?.scan_result?.tls_version || '---';
                      })()}
                    </span>
                    <span className="text-[0.625rem] font-bold py-0.5 px-2 bg-tertiary text-white rounded">SECURE</span>
                  </div>
                  {(scanResult?.scan_result?.tls_versions_list?.length ?? 0) > 1 && (
                    <p className="text-[10px] text-on-surface-variant mt-2">Negotiated: {scanResult?.scan_result?.tls_version}</p>
                  )}
                  <div className="mt-3 h-1 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary w-full"></div>
                  </div>
                </div>

                {/* Key Exchange / Cipher Suite */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Key Exchange</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-on-surface">
                      {keyExchangeLabel}
                    </span>
                    <span className="text-[0.625rem] font-bold py-0.5 px-2 bg-tertiary text-white rounded">
                      {scanResult?.scan_result?.pqc_status || 'STANDARD'}
                    </span>
                  </div>
                  <p className="text-[0.65rem] text-on-surface-variant mt-3 font-medium truncate">{scanResult?.scan_result?.cipher_suite || 'Waiting for scan...'}</p>
                </div>

                {/* Key Length */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Key Strength</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-on-surface">{scanResult?.scan_result?.key_size ? `${scanResult.scan_result.key_size} Bits` : '---'}</span>
                    <span className="text-[0.625rem] font-bold py-0.5 px-2 bg-secondary text-white rounded">ROBUST</span>
                  </div>
                  <div className="mt-4 h-1 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-secondary w-full"></div>
                  </div>
                </div>

                {/* Certificate Authority */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Certificate Authority</p>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary flex items-center">verified_user</span>
                    <span className="text-sm font-bold text-on-surface truncate">{scanResult?.scan_result?.certificate_issuer || '---'}</span>
                  </div>
                  <p className="text-[0.65rem] text-on-surface-variant mt-2">Expires: {scanResult?.scan_result?.expiry_date || '---'}</p>
                </div>

                {/* Risk Level */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Quantum Risk Index</p>
                  <div className="flex items-baseline justify-between">
                    <span className={`text-xl font-bold ${scanResult?.risk?.risk_level === 'Critical' || scanResult?.risk?.risk_level === 'High' ? 'text-error' : scanResult?.risk?.risk_level === 'Medium' ? 'text-secondary' : 'text-tertiary'}`}>
                      {scanResult?.risk?.risk_level ? `${scanResult.risk.risk_level} Risk` : '---'}
                    </span>
                    <span className={`text-[0.625rem] font-bold py-0.5 px-2 ${scanResult?.risk?.risk_level === 'Critical' || scanResult?.risk?.risk_level === 'High' ? 'bg-error' : scanResult?.risk?.risk_level === 'Medium' ? 'bg-secondary' : 'bg-tertiary'} text-white rounded`}>
                      {scanResult?.risk?.score || 0}%
                    </span>
                  </div>
                  <div className="mt-4 text-xs font-medium text-on-surface-variant flex items-center justify-between">
                    <span>Algorithm: {scanResult?.scan_result?.algorithm || '---'}</span>
                    <span>Days left: {scanResult?.scan_result?.days_to_expiry !== undefined ? scanResult.scan_result.days_to_expiry : '---'}</span>
                  </div>
                </div>
                
                {/* Network Architecture */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Network Layer</p>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center justify-between bg-surface-container-highest px-3 py-2 rounded">
                       <span className="text-[10px] uppercase font-bold text-on-surface-variant w-8">IPv4</span>
                       <span className="text-xs font-mono font-bold text-on-surface truncate ml-2">
                           {scanResult?.scan_result?.ipv4 || '---'}
                       </span>
                    </div>
                    <div className="flex items-center justify-between bg-surface-container-highest px-3 py-2 rounded">
                       <span className="text-[10px] uppercase font-bold text-on-surface-variant w-8">IPv6</span>
                       <span className="text-xs font-mono font-bold text-on-surface truncate ml-2">
                           {scanResult?.scan_result?.ipv6 || '---'}
                       </span>
                    </div>
                  </div>
                </div>
                
                {/* PQC Readiness */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">PQC Readiness</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-tertiary">{scanResult?.risk?.label || '---'}</span>
                    <span className={`text-[0.625rem] font-bold py-0.5 px-2 ${scanResult?.risk?.status === 'Secure' ? 'bg-tertiary' : 'bg-error'} text-white rounded`}>{scanResult?.risk?.status?.toUpperCase() || '---'}</span>
                  </div>
                  {scanResult?.scan_result?.pqc_kem_detected && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {(() => {
                        const conf: number = scanResult?.scan_result?.pqc_detection_confidence ?? 0;
                        const method: string = scanResult?.scan_result?.pqc_detection_method ?? '';
                        const label = method.includes('observed') ? 'Observed' : method.includes('cdn') ? 'Inferred' : 'Detected';
                        const confPct = Math.round(conf * 100);
                        const color = conf >= 0.9 ? 'bg-tertiary/15 text-tertiary' : conf >= 0.75 ? 'bg-secondary/15 text-secondary' : 'bg-surface-container-highest text-on-surface-variant';
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${color}`} title={method}>
                            {label} · {confPct}% confidence
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  {scanResult?.scan_result?.pqc_client_compatibility && (
                    <p className="text-[10px] text-on-surface-variant mt-2 leading-relaxed">
                      <span className="font-bold">Client support: </span>{scanResult.scan_result.pqc_client_compatibility}
                    </p>
                  )}
                  {!scanResult?.scan_result?.pqc_kem_detected && scanResult && (
                    <p className="text-[10px] text-on-surface-variant mt-2">No PQC KEM detected across 3 probe methods.</p>
                  )}
                </div>
                
                {/* 8. Crypto Migration Path */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Migration Path</p>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center justify-between text-xs font-bold text-on-surface bg-surface-container-highest px-3 py-2 rounded">
                       <span>{scanResult?.scan_result?.algorithm || 'Current'}</span>
                       <span className="material-symbols-outlined text-[14px] text-on-surface-variant opacity-50">arrow_forward</span>
                       <span className="text-primary">{scanResult?.scan_result?.pqc_status && scanResult.scan_result.pqc_status !== 'None' ? scanResult.scan_result.pqc_status : 'PQC migration required'}</span>
                    </div>
                    <div className="mt-1 text-[0.65rem] text-on-surface-variant font-medium">Recommended secure replacement logic.</div>
                  </div>
                </div>

                {/* 9. Scan Analytics */}
                <div className="bg-surface-container-low rounded-lg p-5">
                  <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Scan Performance</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-on-surface">{isScanning ? '--' : scanPerformance.duration}</span>
                    <span className="text-[0.625rem] font-bold py-0.5 px-2 bg-surface-container-highest text-on-surface rounded uppercase">{scanMode}</span>
                  </div>
                  <p className="text-[0.65rem] text-on-surface-variant mt-2 border-t border-surface-container-highest pt-2">Payloads Verified: {scanResult ? scanPerformance.payloads : 0}</p>
                </div>
                
                {/* Smart Risk Explanation (Full Width) */}
                {(scanResult?.risk?.reason || scanResult?.risk?.recommendation) && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-surface-container-low rounded-lg p-5 border-l-4 border-primary">
                    <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest mb-3 flex items-center gap-2">
                       <span className="material-symbols-outlined text-sm text-primary">psychology</span>
                       Smart Risk Explanation
                    </p>
                    <div className="space-y-3">
                       {scanResult.risk.reason && (
                           <div>
                              <span className="text-xs font-bold text-on-surface">Insight: </span>
                              <span className="text-xs text-on-surface-variant leading-relaxed">{scanResult.risk.reason}</span>
                           </div>
                       )}
                       {scanResult.risk.recommendation && (
                           <div>
                              <span className="text-xs font-bold text-on-surface">Action Required: </span>
                              <span className="text-xs text-on-surface-variant leading-relaxed font-medium">{scanResult.risk.recommendation}</span>
                           </div>
                       )}
                    </div>
                  </div>
                )}
              </div>

              {/* Subdomain Table with Filters */}
              {scanResult?.scan_result?.all_subdomains_detailed && (
                <div className="mt-8 bg-surface-container-low rounded-lg p-5 border border-outline-variant/20">
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
                    <div>
                      <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest">Subdomain Discovery</p>
                      <h4 className="text-sm font-bold text-on-surface mt-1">{scanResult?.name || target} - Subdomain Inventory</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                      <div className="px-3 py-2 rounded bg-surface-container-highest">Discovered: <span className="font-bold">{scanResult?.scan_result?.subdomains_discovery?.summary?.total_discovered_subdomains ?? subdomainRows.length}</span></div>
                      <div className="px-3 py-2 rounded bg-surface-container-highest">Showing: <span className="font-bold">{Math.min((subdomainPage + 1) * subdomainPageSize, filteredSubdomainRows.length)}</span></div>
                      <div className="px-3 py-2 rounded bg-surface-container-highest">Scanned: <span className="font-bold">{subdomainRows.length}</span></div>
                    </div>
                    {scanResult?.scan_result?.subdomains_discovery?.summary?.discovery_sources && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(scanResult.scan_result.subdomains_discovery.summary.discovery_sources as Record<string,number>)
                          .filter(([,v]) => (v as number) > 0)
                          .map(([source, count]) => (
                            <span key={source} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                              {source}: {String(count)}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <input
                      value={subdomainQuery}
                      onChange={(e) => setSubdomainQuery(e.target.value)}
                      className="md:col-span-2 bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Search subdomain..."
                      type="text"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                      className="bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <select
                      value={bucketFilter}
                      onChange={(e) => setBucketFilter(e.target.value as 'all' | 'pqc_ready' | 'standard' | 'critical')}
                      className="bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Criteria</option>
                      <option value="pqc_ready">PQC Ready</option>
                      <option value="standard">Standard</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto rounded border border-outline-variant/20">
                    <table className="w-full text-left text-xs min-w-max">
                      <thead className="bg-surface-container-highest sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Subdomain</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">IP</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Status</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Criteria</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">SSL ⭐</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">TLS/SSL</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Algorithm</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Key Size</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Cipher Suite</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Issuer</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Expires</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Days Left</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Response</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Cert Valid</th>
                          <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Vulns</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedSubdomainRows.length === 0 ? (
                          <tr>
                            <td className="px-3 py-6 text-sm text-on-surface-variant" colSpan={15}>No subdomains match current filters.</td>
                          </tr>
                        ) : (
                          pagedSubdomainRows.map((row: any, idx: number) => (
                            <tr key={`${row.subdomain}-${idx}`} className="border-t border-outline-variant/10 hover:bg-surface-container-highest/50 transition-colors">
                              <td className="px-3 py-2 text-xs font-medium text-on-surface whitespace-nowrap">{row.subdomain || 'N/A'}</td>
                              <td className="px-3 py-2 text-xs text-on-surface-variant font-mono whitespace-nowrap">{row.ipv4 || row.ipv6 || 'N/A'}</td>
                              <td className="px-3 py-2 text-xs whitespace-nowrap">
                                <span className={`px-2 py-1 rounded font-bold text-xs ${row.status === 'active' ? 'bg-tertiary/15 text-tertiary' : 'bg-error/15 text-error'}`}>
                                  {row.status || 'unknown'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs font-bold uppercase whitespace-nowrap">
                                <span className={`${row.bucket === 'pqc_ready' ? 'text-tertiary' : row.bucket === 'standard' ? 'text-secondary' : 'text-error'}`}>
                                  {String(row.bucket || 'critical').replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs font-bold whitespace-nowrap">{row.ssl_rating || 'N/A'}</td>
                              <td className="px-3 py-2 text-xs text-on-surface-variant whitespace-nowrap">{(row.tls_versions || []).join(', ') || 'N/A'}</td>
                              <td className="px-3 py-2 text-xs text-on-surface-variant font-medium whitespace-nowrap">{row.algorithm || 'N/A'}</td>
                              <td className="px-3 py-2 text-xs text-on-surface-variant font-mono whitespace-nowrap">{row.key_size ? `${row.key_size}b` : 'N/A'}</td>
                              <td className="px-3 py-2 text-xs text-on-surface-variant truncate max-w-xs" title={row.cipher_suite}>{row.cipher_suite ? row.cipher_suite.substring(0, 30) + '...' : 'N/A'}</td>
                              <td className="px-3 py-2 text-xs text-on-surface-variant truncate max-w-sm" title={row.certificate_issuer}>{row.certificate_issuer ? row.certificate_issuer.substring(0, 25) : 'N/A'}</td>
                              <td className="px-3 py-2 text-xs text-on-surface-variant whitespace-nowrap">{row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : 'N/A'}</td>
                              <td className="px-3 py-2 text-xs font-bold whitespace-nowrap">
                                <span className={`${row.days_to_expiry === null ? 'text-on-surface-variant' : row.days_to_expiry < 30 ? 'text-error' : row.days_to_expiry < 90 ? 'text-secondary' : 'text-tertiary'}`}>
                                  {row.days_to_expiry ?? 'N/A'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-on-surface-variant whitespace-nowrap">{row.response_time_ms ? `${row.response_time_ms}ms` : 'N/A'}</td>
                              <td className="px-3 py-2 text-xs whitespace-nowrap">
                                <span className={`px-2 py-1 rounded font-bold text-xs ${row.certificate_valid ? 'bg-tertiary/15 text-tertiary' : 'bg-error/15 text-error'}`}>
                                  {row.certificate_valid ? '✓' : '✗'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs whitespace-nowrap">
                                <span className={`px-2 py-1 rounded font-bold text-xs ${row.has_vulnerabilities ? 'bg-error/15 text-error' : 'bg-tertiary/15 text-tertiary'}`}>
                                  {row.has_vulnerabilities ? '⚠️' : 'None'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredSubdomainRows.length > subdomainPageSize && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <p className="text-on-surface-variant">
                        Page <span className="font-bold text-on-surface">{subdomainPage + 1}</span> of <span className="font-bold text-on-surface">{subdomainPageCount}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSubdomainPage((page) => Math.max(0, page - 1))}
                          disabled={subdomainPage === 0}
                          className="px-3 py-2 rounded bg-surface-container-highest text-on-surface font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-variant transition-colors"
                        >
                          Previous 10
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubdomainPage((page) => Math.min(subdomainPageCount - 1, page + 1))}
                          disabled={subdomainPage >= subdomainPageCount - 1}
                          className="px-3 py-2 rounded bg-primary text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-colors"
                        >
                          Next 10
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {scanResult && (
                <div className="mt-8 bg-surface-container-low rounded-lg p-5 border border-outline-variant/20">
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
                    <div>
                      <p className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest">Mobile App Similarity Report</p>
                      <h4 className="text-sm font-bold text-on-surface mt-1">Apps matching {scanResult?.name || target}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="px-3 py-2 rounded bg-surface-container-highest">Total: <span className="font-bold">{scanResult?.scan_result?.mobile_info?.mobile_apps_found || 0}</span></div>
                      <div className="px-3 py-2 rounded bg-surface-container-highest">Top Match: <span className="font-bold">{topMobileMatch?.name || 'N/A'}</span></div>
                    </div>
                  </div>

                  {mobileApps.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No matching mobile apps found for this domain.</p>
                  ) : (
                    <div className="overflow-x-auto rounded border border-outline-variant/20">
                      <table className="w-full text-left text-xs min-w-max">
                        <thead className="bg-surface-container-highest">
                          <tr>
                            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Platform</th>
                            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">App Name</th>
                            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Relevance</th>
                            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">Store Link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mobileApps.slice(0, 20).map((app: any, idx: number) => (
                            <tr key={`${app.platform}-${app.app_id || idx}`} className="border-t border-outline-variant/10 hover:bg-surface-container-highest/50 transition-colors">
                              <td className="px-3 py-2 text-xs font-medium capitalize">{app.platform || 'unknown'}</td>
                              <td className="px-3 py-2 text-xs font-medium">{app.name || 'Unknown'}</td>
                              <td className="px-3 py-2 text-xs font-bold">{typeof app.relevance === 'number' ? `${Math.round(app.relevance * 100)}%` : 'N/A'}</td>
                              <td className="px-3 py-2 text-xs">
                                {app.store_url ? (
                                  <a href={app.store_url} target="_blank" rel="noreferrer" className="text-primary underline">Open</a>
                                ) : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Sidebar Content: Scheduling & History */}
          <aside className="col-span-12 lg:col-span-4 space-y-8">
            {/* Auto Scheduling Section — hidden when role lacks permission */}
            {hasPermission('can_schedule_scans') && (
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-transparent">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-primary flex items-center">calendar_month</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">Auto Scheduling</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Frequency</label>
                  <select
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {scheduleFrequency === 'weekly' && (
                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Day of Week</label>
                    <select
                      value={scheduleDayOfWeek}
                      onChange={(e) => setScheduleDayOfWeek(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="mon">Monday</option>
                      <option value="tue">Tuesday</option>
                      <option value="wed">Wednesday</option>
                      <option value="thu">Thursday</option>
                      <option value="fri">Friday</option>
                      <option value="sat">Saturday</option>
                      <option value="sun">Sunday</option>
                    </select>
                  </div>
                )}

                {scheduleFrequency === 'monthly' && (
                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Day of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={scheduleDayOfMonth}
                      onChange={(e) => setScheduleDayOfMonth(Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Email</label>
                  <input
                    type="email"
                    value={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.value)}
                    placeholder="abc@gmail.com"
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <button onClick={handleSchedule} disabled={isScheduling} className={`w-full mt-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-white rounded font-bold text-xs transition-all hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 ${isScheduling ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <span className="material-symbols-outlined text-[14px]">auto_mode</span>
                {isScheduling ? 'Scheduling...' : 'Auto Schedule Scan'}
              </button>
            </div>
            )}

            {/* Risk Formula Transparency */}
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/20">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface mb-4">Risk Formula Transparency</h3>
              <div className="space-y-4 text-xs text-on-surface-variant">
                <div className="bg-surface-container-low rounded p-3 border border-outline-variant/20">
                  <p className="font-bold text-on-surface mb-2">Core Score Formula (v3 PQC-centric)</p>
                  <div className="font-mono text-[11px] leading-6 bg-surface-container-highest rounded p-3 border border-outline-variant/20">
                    <p>Score = 100 − Σ(weight × factor_risk)</p>
                    <p className="mt-2">KEM 35% + Cert Algo 25% + Protocol 15% + Cert Health 10% + Vulns 10% + Exposure 5%</p>
                    <p className="mt-2">Post-rules: PQC floor (hybrid≥68, full≥80), expired cert cap (≤15).</p>
                    <p className="mt-2 text-[10px]">Formula Version: {scanResult?.risk?.formula_version || 'v3-pqc-centric'}</p>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded p-3 border border-outline-variant/20">
                  <p className="font-bold text-on-surface mb-2">Live Factor Contributions</p>
                  <div className="font-mono text-[10px] leading-5 bg-surface-container-highest rounded p-3 border border-outline-variant/20 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left">
                      <thead>
                        <tr className="text-on-surface-variant">
                          <th className="pr-3">Factor</th>
                          <th className="pr-3">Value</th>
                          <th className="pr-3">Weight</th>
                          <th>Weighted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskContributionRows.map((row) => (
                          <tr key={row.key} className="text-on-surface">
                            <td className="pr-3 py-1">{row.label}</td>
                            <td className="pr-3 py-1">{row.factorValue}</td>
                            <td className="pr-3 py-1">{row.weight.toFixed(2)}</td>
                            <td className="py-1">{row.contribution.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-3">Total Penalty = {scanResult?.risk?.total_penalty ?? computedPenalty}</p>
                    <p>Score (raw) = {scanResult?.risk?.score_pre_overrides ?? Math.max(0, Math.floor(100 - (scanResult?.risk?.total_penalty ?? computedPenalty)))}</p>
                    <p>Score (final) = {scanResult?.risk?.score ?? 0}</p>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded p-3 border border-outline-variant/20">
                  <p className="font-bold text-on-surface mb-2">KEM Rules (35% weight — primary quantum threat)</p>
                  <p>Full PQC KEM (MLKEM-768/1024): 0 penalty — session is quantum-safe.</p>
                  <p>Hybrid PQC KEM (X25519MLKEM768 / X25519Kyber768): 5 penalty — quantum-safe + classical fallback.</p>
                  <p>No PQC KEM: 100 penalty — vulnerable to harvest-now-decrypt-later attacks.</p>
                </div>

                <div className="bg-surface-container-low rounded p-3 border border-outline-variant/20">
                  <p className="font-bold text-on-surface mb-2">Certificate Algorithm Rules (25% weight)</p>
                  <p>PQC cert (ML-DSA / Dilithium / Falcon): 0 penalty.</p>
                  <p>RSA 2048: 80 penalty. RSA &lt;2048: 100 penalty. RSA &gt;2048: 60 penalty.</p>
                  <p>ECC P-256+: 30 penalty. ECC &lt;224-bit: 70 penalty.</p>
                </div>

                <div className="bg-surface-container-low rounded p-3 border border-outline-variant/20">
                  <p className="font-bold text-on-surface mb-2">Protocol Rules (15% weight)</p>
                  <p>TLS 1.3 only: 0 penalty (required for PQC KEMs).</p>
                  <p>TLS 1.3 + 1.2: 10 penalty (minor downgrade risk).</p>
                  <p>TLS 1.2 only: 50 penalty. TLS 1.0/1.1: 100 penalty (broken).</p>
                </div>

                <div className="bg-surface-container-low rounded p-3 border border-outline-variant/20">
                  <p className="font-bold text-on-surface mb-2">Risk Bands</p>
                  <p>Score ≥ 80: Low (PQC Ready)</p>
                  <p>60–79: Medium (Quantum Safe)</p>
                  <p>40–59: High (Needs Upgrade)</p>
                  <p>&lt;40: Critical (Not Safe)</p>
                </div>

                <div className="bg-surface-container-low rounded p-3 border border-outline-variant/20">
                  <p className="font-bold text-on-surface mb-2">Post-Formula Adjustments</p>
                  {Array.isArray(scanResult?.risk?.adjustments) && scanResult.risk.adjustments.length > 0 ? (
                    <div className="space-y-1">
                      {scanResult.risk.adjustments.map((item: string, idx: number) => (
                        <p key={`${item}-${idx}`}>- {item}</p>
                      ))}
                    </div>
                  ) : (
                    <p>No post-formula adjustments were applied for this scan.</p>
                  )}
                </div>

                <div className="bg-surface-container-low rounded p-3 border border-outline-variant/20">
                  <p className="font-bold text-on-surface mb-2">Classification Math</p>
                  <div className="font-mono text-[10px] leading-5 bg-surface-container-highest rounded p-3 border border-outline-variant/20 overflow-x-auto">
                    <div className="flex items-start gap-1 min-w-[300px]">
                      <span>Improvement%</span>
                      <span>=</span>
                      <div className="inline-flex flex-col items-center min-w-[190px]">
                        <span className="border-b border-on-surface px-2 text-center">(BS - CS) x 100</span>
                        <span className="px-2 text-center">BS</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-on-surface-variant">BS = Baseline Score</p>
                  <p className="text-[10px] text-on-surface-variant">CS = Current Score</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-surface-container-highest text-on-surface px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-8">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <p className="text-sm font-bold">{toastMsg}</p>
        </div>
      )}
    </main>
  );
};

export default Scanner;

