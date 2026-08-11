import { useEffect, useState } from 'react';

const PERMISSION_KEYS = [
  { key: 'can_scan',           label: 'Run Scans',                  icon: 'biotech',          desc: 'Start new domain scans' },
  { key: 'can_view_history',   label: 'View Scan History',           icon: 'history',          desc: 'Access previous scan results' },
  { key: 'can_export_pdf',     label: 'Export PDF Reports',          icon: 'picture_as_pdf',   desc: 'Download website and CISO PDF reports' },
  { key: 'can_send_email',     label: 'Send Email Reports',          icon: 'email',            desc: 'Dispatch domain reports via email' },
  { key: 'can_view_cbom',      label: 'View CBOM',                   icon: 'account_tree',     desc: 'Access Cryptographic Bill of Materials' },
  { key: 'can_view_pqc',       label: 'View PQC Posture',            icon: 'security',         desc: 'Access PQC posture and cyber rating' },
  { key: 'can_schedule_scans', label: 'Schedule Auto Scans',         icon: 'calendar_month',   desc: 'Create recurring scheduled scan jobs' },
  { key: 'can_use_ai',         label: 'Use AI Assistant',            icon: 'smart_toy',        desc: 'Access the AI chat assistant' },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  Admin: {
    can_scan: true, can_view_history: true, can_export_pdf: true,
    can_send_email: true, can_view_cbom: true, can_view_pqc: true,
    can_schedule_scans: true, can_use_ai: true,
  },
  User: {
    can_scan: true, can_view_history: false, can_export_pdf: false,
    can_send_email: false, can_view_cbom: true, can_view_pqc: true,
    can_schedule_scans: false, can_use_ai: true,
  },
};

const STORAGE_KEY = 'qps_role_permissions';

export function loadPermissions(): Record<string, Record<string, boolean>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PERMISSIONS;
}

function savePermissions(perms: Record<string, Record<string, boolean>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}

export function hasPermission(permission: string): boolean {
  const role = localStorage.getItem('userRole') || 'User';
  if (role === 'Super Admin') return true;
  const perms = loadPermissions();
  return perms[role]?.[permission] ?? false;
}

const Settings = () => {
  const role = localStorage.getItem('userRole') || 'User';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const isSuperAdmin = role === 'Super Admin';

  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(loadPermissions);
  const [users, setUsers] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch(`${apiBase}/api/users`, { headers: { 'x-user-role': role } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => undefined);
  }, [apiBase, isSuperAdmin, role]);

  const toggle = (targetRole: string, key: string) => {
    setPermissions(prev => ({
      ...prev,
      [targetRole]: { ...prev[targetRole], [key]: !prev[targetRole]?.[key] },
    }));
  };

  const handleSave = () => {
    savePermissions(permissions);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setPermissions(DEFAULT_PERMISSIONS);
    savePermissions(DEFAULT_PERMISSIONS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!isSuperAdmin) {
    return (
      <main className="md:ml-64 pt-24 pb-12 px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-on-surface mb-2">Settings</h1>
          <p className="text-on-surface-variant mb-8">Your account settings and preferences.</p>
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10 shadow-sm text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 block">lock</span>
            <p className="text-on-surface font-semibold">Role Management is restricted to Super Admins.</p>
            <p className="text-on-surface-variant text-sm mt-2">Contact your system administrator to request permission changes.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="md:ml-64 pt-24 pb-12 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
            <p className="text-on-surface-variant text-sm mt-1">Super Admin control panel — manage access permissions and user roles.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Reset to Defaults
            </button>
            <button onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">{saved ? 'check' : 'save'}</span>
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-container-highest rounded-xl mb-8 w-fit">
          {(['permissions', 'users'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {tab === 'permissions' ? 'Role Permissions' : 'User Management'}
            </button>
          ))}
        </div>

        {/* PERMISSIONS TAB */}
        {activeTab === 'permissions' && (
          <div className="space-y-8">
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-primary/20 text-sm text-primary flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
              <span>Super Admin always has full access to everything. These settings control what <b>Admin</b> and <b>User</b> roles can do.</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-surface-container-low border-b border-outline-variant/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant w-1/2">Feature</th>
                    {(['Admin', 'User'] as const).map(r => (
                      <th key={r} className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-black ${r === 'Admin' ? 'bg-secondary' : 'bg-outline'}`}>{r[0]}</span>
                          {r}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black">S</span>
                        Super Admin
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 bg-surface-container-lowest">
                  {PERMISSION_KEYS.map(({ key, label, icon, desc }) => (
                    <tr key={key} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">{icon}</span>
                          <div>
                            <p className="font-semibold text-on-surface">{label}</p>
                            <p className="text-[11px] text-on-surface-variant">{desc}</p>
                          </div>
                        </div>
                      </td>
                      {(['Admin', 'User'] as const).map(r => {
                        const enabled = permissions[r]?.[key] ?? false;
                        return (
                          <td key={r} className="px-6 py-4 text-center">
                            <button onClick={() => toggle(r, key)}
                              className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-7' : 'left-1'}`}></span>
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center">
                        <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">How Enforcement Works</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-on-surface-variant">
                <p>• <b>Run Scans</b> — Controls access to the Scanner page and the Start Scan button.</p>
                <p>• <b>View Scan History</b> — Controls whether previous scans show in history panel.</p>
                <p>• <b>Export PDF Reports</b> — Controls visibility of export/download buttons.</p>
                <p>• <b>Send Email Reports</b> — Controls access to the email dispatch form.</p>
                <p>• <b>Schedule Auto Scans</b> — Controls visibility of the scheduling panel.</p>
                <p>• <b>Use AI Assistant</b> — Controls access to the AI chat page.</p>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden">
              <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-between">
                <p className="text-sm font-bold text-on-surface">Registered Users ({users.length})</p>
              </div>
              {users.length === 0 ? (
                <p className="px-6 py-8 text-sm text-on-surface-variant text-center">No users found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-outline-variant/10">
                    <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
                      <th className="px-6 py-3 text-left">Name</th>
                      <th className="px-6 py-3 text-left">Username</th>
                      <th className="px-6 py-3 text-left">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {users.map((u, i) => (
                      <tr key={i} className="hover:bg-surface-container-low/50">
                        <td className="px-6 py-3 font-semibold text-on-surface">{u.name || u.username}</td>
                        <td className="px-6 py-3 text-on-surface-variant">{u.username}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            u.role === 'Super Admin' ? 'bg-primary/10 text-primary' :
                            u.role === 'Admin' ? 'bg-secondary/10 text-secondary' :
                            'bg-surface-container-highest text-on-surface-variant'
                          }`}>{u.role}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-on-surface-variant">To change a user's role, use the <code className="bg-surface-container-highest px-1 rounded">PATCH /api/users/role</code> API endpoint directly or through the AI Assistant.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Settings;
