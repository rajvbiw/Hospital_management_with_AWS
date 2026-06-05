import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import { triggerToast } from '../components/Layout';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      triggerToast('success', 'Logged in successfully!');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      triggerToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail: string) => {
    setLoading(true);
    setError(null);
    setEmail(roleEmail);
    setPassword('password123');

    try {
      await login(roleEmail, 'password123');
      triggerToast('success', 'Logged in successfully!');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Quick login failed. Verify backend server status.');
      triggerToast('error', 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const rolesShortcuts = [
    { label: 'Admin', email: 'admin@hospital.com', desc: 'Audit logs & config' },
    { label: 'Doctor', email: 'sarah.connor@hospital.com', desc: 'EHR records & schedules' },
    { label: 'Nurse', email: 'florence@hospital.com', desc: 'Patients & schedules' },
    { label: 'Pharmacist', email: 'pharmacist@hospital.com', desc: 'Dispensing & stock' },
    { label: 'Billing', email: 'billing@hospital.com', desc: 'Invoices & claims' }
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F9FC]">
      {/* Visual Accent Sidebar Panel (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-[#0F3460] text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Abstract Background Design */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1B4D8A]/30 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#0A2545]/40 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
        
        <div className="z-10 flex items-center gap-3">
          <span className="text-3xl">🏥</span>
          <span className="font-extrabold text-2xl tracking-wide uppercase">CareSuite</span>
        </div>

        <div className="z-10 my-auto max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Unified Patient Care <br/>& Record Management
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed font-light">
            Secure, HIPAA-aligned portal for clinical charts, pharmacy inventory control, automated billing pipelines, and secure scheduling.
          </p>
        </div>

        <div className="z-10 text-sm text-blue-200">
          © {new Date().getFullYear()} CareSuite PMS. All Rights Reserved.
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-extrabold text-slate-800">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Enter credentials to securely authenticate your portal</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-shake">
              <ShieldAlert className="shrink-0 text-red-500" size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Corporate Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.com"
                  className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Secure Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <KeyRound size={18} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#0F3460] focus:ring-[#0F3460] border-slate-300 w-4 h-4 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="font-semibold text-[#0F3460] hover:text-[#1B4D8A]">Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Login Helpers (Seeded Demo Shortcuts) */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider text-center mb-3">
              Seed Demo User Quick Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {rolesShortcuts.map(role => (
                <button
                  key={role.label}
                  type="button"
                  onClick={() => handleQuickLogin(role.email)}
                  disabled={loading}
                  className="flex flex-col text-left p-2.5 bg-white border border-slate-200 hover:border-[#0F3460] hover:bg-blue-50/20 rounded-xl transition-all"
                >
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#0F3460] rounded-full"></span>
                    {role.label}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{role.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
