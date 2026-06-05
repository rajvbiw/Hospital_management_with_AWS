import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Pills, 
  CreditCard, 
  History, 
  LogOut, 
  Bell, 
  User as UserIcon,
  Menu,
  X,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Simple toast trigger mechanism using custom window events
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: 'success' | 'error' | 'warning'; message: string }>;
      const { type, message } = customEvent.detail;
      const id = Date.now();
      
      setToasts(prev => [...prev, { id, type, message }]);
      
      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };

    window.addEventListener('app-toast', handleToast);
    return () => {
      window.removeEventListener('app-toast', handleToast);
    };
  }, []);

  if (!user) return null;

  // Role-based sidebar configuration
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'doctor', 'nurse', 'pharmacist', 'billing'] },
    { name: 'Patients', path: '/patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'billing'] },
    { name: 'Appointments', path: '/appointments', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'billing'] },
    { name: 'Medical Records', path: '/records', icon: FileText, roles: ['admin', 'doctor', 'nurse'] },
    { name: 'Pharmacy', path: '/pharmacy', icon: Pills, roles: ['admin', 'pharmacist'] },
    { name: 'Billing', path: '/billing', icon: CreditCard, roles: ['admin', 'billing'] },
    { name: 'Audit Log', path: '/audit', icon: History, roles: ['admin'] },
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const staticNotifications = [
    { id: 1, text: 'Low stock warning for Lisinopril', time: '5m ago', read: false },
    { id: 2, text: 'Appointment booked: James Smith', time: '1h ago', read: true },
    { id: 3, text: 'Payment cleared for Invoice #1029', time: '3h ago', read: true }
  ];

  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">
      {/* Toast Overlay */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`p-4 rounded-xl shadow-lg flex items-start gap-3 border animate-slide-in text-white ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' :
              toast.type === 'error' ? 'bg-red-600 border-red-500' : 'bg-amber-600 border-amber-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="shrink-0" size={20} />}
            {toast.type === 'error' && <XCircle className="shrink-0" size={20} />}
            {toast.type === 'warning' && <AlertCircle className="shrink-0" size={20} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0F3460] text-white shrink-0 shadow-xl">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#1A4B83]">
          <span className="text-2xl">🏥</span>
          <span className="font-extrabold text-xl tracking-wide uppercase">CareSuite</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {allowedMenuItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#1B4D8A] text-white shadow-md' 
                    : 'text-blue-100 hover:bg-[#1A4577] hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#1A4B83]">
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-200 hover:text-white hover:bg-red-950/40 rounded-xl font-medium transition-all duration-200"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)}></div>
          <aside className="relative flex flex-col w-64 max-w-xs bg-[#0F3460] text-white h-full shadow-2xl animate-slide-right">
            <div className="h-16 flex items-center justify-between px-6 border-b border-[#1A4B83]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏥</span>
                <span className="font-extrabold text-xl">CareSuite</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-white hover:text-blue-200">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {allowedMenuItems.map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-[#1B4D8A] text-white shadow-md' 
                        : 'text-blue-100 hover:bg-[#1A4577] hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#1A4B83]">
              <button 
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 text-red-200 hover:text-white hover:bg-red-950/40 rounded-xl font-medium transition-all"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30">
          <button 
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900 focus:outline-none"
          >
            <Menu size={24} />
          </button>
          
          <div className="hidden sm:block text-slate-500 font-medium">
            Hospital Patient Management System
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 relative"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-100 font-semibold text-slate-800 flex justify-between items-center">
                      <span>Notifications</span>
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">1 New</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {staticNotifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`px-4 py-3 hover:bg-slate-50 border-b border-slate-50 cursor-pointer flex justify-between items-start gap-2 ${
                            !n.read ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div>
                            <p className="text-sm text-slate-700 font-medium">{n.text}</p>
                            <span className="text-xs text-slate-400 mt-1 block">{n.time}</span>
                          </div>
                          {!n.read && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mt-1.5"></span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile Info */}
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-blue-50 text-[#0F3460] font-semibold rounded-full flex items-center justify-center border border-blue-100">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
                <span className="text-xs font-medium text-slate-400 capitalize bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 mt-0.5 inline-block">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
export const triggerToast = (type: 'success' | 'error' | 'warning', message: string) => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type, message } }));
};
