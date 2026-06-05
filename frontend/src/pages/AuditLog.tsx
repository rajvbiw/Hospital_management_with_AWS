import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  History, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  User as UserIcon,
  Globe
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuditEntry {
  id: number;
  user_id: number | null;
  action: string;
  table_name: string;
  record_id: number | null;
  ip_address: string | null;
  created_at: string;
  user: User | null;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AuditLog: React.FC = () => {
  const { user, api } = useAuth();
  const [page, setPage] = useState(1);

  // Fetch Audit Logs Query (Admin only)
  const { data, isLoading, isError } = useQuery<AuditResponse>({
    queryKey: ['auditLogs', page],
    queryFn: async () => {
      const res = await api.get('/api/audit-logs', {
        params: { page, limit: 15 }
      });
      return res.data;
    },
    enabled: user?.role === 'admin'
  });

  if (user?.role !== 'admin') {
    return (
      <div className="text-center p-8 bg-white border border-slate-100 rounded-2xl">
        <p className="font-semibold text-lg text-slate-800">Administrative Portal Restricted</p>
        <p className="text-sm mt-1 text-slate-500">Only Administrator accounts can inspect corporate audit compliance logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <History className="text-[#0F3460]" size={28} />
            <span>Audit Trail Compliance</span>
          </h1>
          <p className="text-slate-500 mt-1">Review system access logs and patient chart database mutations (HIPAA Audit Controls).</p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-150 flex items-center gap-2 text-xs font-semibold">
          <ShieldCheck size={16} />
          <span>Active Auditing Enforced</span>
        </div>
      </div>

      {/* Audit Log Ledger table container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-55 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Operator</th>
                <th className="px-6 py-4 font-mono">Role</th>
                <th className="px-6 py-4">Resource/Table</th>
                <th className="px-6 py-4">Record ID</th>
                <th className="px-6 py-4"><span className="flex items-center gap-1.5"><Globe size={14} />IP Address</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4"><div className="h-6 bg-slate-150 rounded w-full"></div></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-red-500 font-semibold">
                    Failed to fetch compliance logs. Make sure backend is running.
                  </td>
                </tr>
              ) : data?.logs && data.logs.length > 0 ? (
                data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-xs text-slate-450 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-wide ${
                        log.action.includes('CREATE') || log.action.includes('LOGIN') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        log.action.includes('UPDATE') || log.action.includes('DISPENSE') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        log.action.includes('DELETE') ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <p className="font-semibold text-slate-800">{log.user.name}</p>
                          <span className="text-xs text-slate-400 block font-light">{log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-light flex items-center gap-1">
                          <UserIcon size={12} />
                          System / Public Action
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-xs font-semibold bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full border border-slate-200">
                        {log.user?.role || 'system'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-650 capitalize">{log.table_name}</td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">
                      {log.record_id ? `#${log.record_id}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {log.ip_address || 'localhost'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-light">
                    No compliance logs recorded in ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data && data.totalPages > 1 && (
          <div className="p-5 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-505 font-light">
              Showing page <span className="font-semibold text-slate-800">{data.page}</span> of <span className="font-semibold text-slate-800">{data.totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-slate-650"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-slate-650"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
