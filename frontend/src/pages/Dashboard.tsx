import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  AlertCircle, 
  CreditCard, 
  ArrowUpRight,
  Plus, 
  Activity,
  ClipboardList
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsData {
  totalPatients: number;
  todayAppointments: number;
  pendingBills: number;
  lowStockCount: number;
  appointmentTrends: { date: string; appointments: number }[];
}

const Dashboard: React.FC = () => {
  const { user, api } = useAuth();

  const { data, isLoading, error } = useQuery<StatsData>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/stats');
      return res.data;
    },
    refetchInterval: 30000 // refetch every 30s
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-10 bg-slate-200 rounded w-40"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-80 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center p-8 bg-white border border-red-200 text-red-600 rounded-2xl">
        <p className="font-semibold text-lg">Error loading dashboard stats.</p>
        <p className="text-sm mt-1 text-slate-500">Please make sure the backend database and API server are running.</p>
      </div>
    );
  }

  // Define Quick Actions based on Role
  const renderQuickActions = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <>
            <Link to="/patients" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Add New Patient</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><Plus size={18} /></span>
            </Link>
            <Link to="/appointments" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Schedule Appointment</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><Plus size={18} /></span>
            </Link>
            <Link to="/pharmacy" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Check Pharmacy Stock</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><ArrowUpRight size={18} /></span>
            </Link>
            <Link to="/audit" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Audit Compliance Logs</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><ArrowUpRight size={18} /></span>
            </Link>
          </>
        );
      case 'doctor':
        return (
          <>
            <Link to="/appointments" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">View Appointment Schedule</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><ArrowUpRight size={18} /></span>
            </Link>
            <Link to="/records" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Log Medical Records</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><Plus size={18} /></span>
            </Link>
          </>
        );
      case 'nurse':
        return (
          <>
            <Link to="/patients" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Register Patient</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><Plus size={18} /></span>
            </Link>
            <Link to="/appointments" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Book Appointment</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><Plus size={18} /></span>
            </Link>
          </>
        );
      case 'pharmacist':
        return (
          <>
            <Link to="/pharmacy" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Dispense Pending Rx</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><ArrowUpRight size={18} /></span>
            </Link>
            <Link to="/pharmacy" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Add Stock Entry</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><Plus size={18} /></span>
            </Link>
          </>
        );
      case 'billing':
        return (
          <>
            <Link to="/billing" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">View Active Invoices</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><ArrowUpRight size={18} /></span>
            </Link>
            <Link to="/billing" className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 group">
              <span className="font-semibold text-slate-700">Collect New Payment</span>
              <span className="p-2 bg-blue-50 text-[#0F3460] rounded-xl group-hover:bg-[#0F3460] group-hover:text-white transition-all"><CreditCard size={18} /></span>
            </Link>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Clinical Dashboard</h1>
          <p className="text-slate-500 mt-1">Hello, {user?.name}. Here is your operations snapshot for today.</p>
        </div>
        <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Activity className="text-emerald-500 animate-pulse" size={16} />
          <span>System Healthy</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Patients */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="p-4 bg-blue-50 text-[#0F3460] rounded-2xl group-hover:bg-[#0F3460] group-hover:text-white transition-all duration-300">
            <Users size={24} />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider block">Total Patients</span>
            <span className="text-3xl font-black text-slate-800 mt-1 block">{data.totalPatients}</span>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <Calendar size={24} />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider block">Today's Visits</span>
            <span className="text-3xl font-black text-slate-800 mt-1 block">{data.todayAppointments}</span>
          </div>
        </div>

        {/* Pending Bills */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
            <CreditCard size={24} />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider block">Unpaid Invoices</span>
            <span className="text-3xl font-black text-slate-800 mt-1 block">{data.pendingBills}</span>
          </div>
        </div>

        {/* Low Stock count */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
          <div className={`p-4 rounded-2xl group-hover:text-white transition-all duration-300 ${
            data.lowStockCount > 0 
              ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-600' 
              : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600'
          }`}>
            <AlertCircle size={24} />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider block">Low Stock Drugs</span>
            <span className="text-3xl font-black text-slate-800 mt-1 block">{data.lowStockCount}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart and Action items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Area Chart Panel */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-[#0F3460]" />
            <span>Appointment Schedule Load Trend</span>
          </h3>
          <div className="h-80 w-full pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.appointmentTrends} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F3460" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0F3460" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1E293B' }}
                />
                <Area type="monotone" dataKey="appointments" stroke="#0F3460" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAppts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ClipboardList size={20} className="text-[#0F3460]" />
              <span>Role Quick Actions</span>
            </h3>
            <div className="space-y-3">
              {renderQuickActions()}
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50/40 rounded-2xl border border-blue-50/80 text-xs text-slate-500 leading-relaxed font-light">
            <span className="font-semibold text-slate-600 block mb-1">HIPAA Confidentiality Notice</span>
            This session is logged and encrypted. Access to patient records is monitored for auditing purposes. Do not leave your workstation unattended.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
