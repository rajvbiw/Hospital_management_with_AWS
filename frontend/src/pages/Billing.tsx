import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  Search, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  X,
  TrendingUp,
  AlertCircle,
  FileText
} from 'lucide-react';
import { triggerToast } from '../components/Layout';

interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Bill {
  id: number;
  patient_id: number;
  appointment_id: number | null;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid';
  payment_method: string | null;
  created_at: string;
  patient?: Patient;
}

const Billing: React.FC = () => {
  const { user, api } = useAuth();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');

  // Fetch Invoices Query
  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ['billingInvoices', filterStatus],
    queryFn: async () => {
      const res = await api.get('/api/billing', {
        params: { status: filterStatus || undefined }
      });
      return res.data;
    }
  });

  // Record Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ billId, amount, method }: { billId: number; amount: number; method: string }) => {
      return api.put(`/api/billing/${billId}/payment`, { amount, payment_method: method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingInvoices'] });
      triggerToast('success', 'Payment logged and invoice updated!');
      closePaymentModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Payment failed';
      triggerToast('error', msg);
    }
  });

  const openPaymentModal = (bill: Bill) => {
    setSelectedBill(bill);
    const balance = parseFloat(bill.total_amount.toString()) - parseFloat(bill.paid_amount.toString());
    setPaymentAmount(balance.toFixed(2));
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedBill(null);
    setPaymentAmount('');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      triggerToast('error', 'Please enter a valid payment amount');
      return;
    }

    paymentMutation.mutate({
      billId: selectedBill.id,
      amount,
      method: paymentMethod
    });
  };

  // Calculate high-level metrics from filtered bills for display
  const metrics = bills.reduce(
    (acc, bill) => {
      const total = parseFloat(bill.total_amount.toString());
      const paid = parseFloat(bill.paid_amount.toString());
      acc.totalBilled += total;
      acc.totalCollected += paid;
      acc.totalOutstanding += (total - paid);
      return acc;
    },
    { totalBilled: 0, totalCollected: 0, totalOutstanding: 0 }
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <CreditCard className="text-[#0F3460]" size={28} />
          <span>Billing & Claims Ledger</span>
        </h1>
        <p className="text-slate-500 mt-1">Audit billing files, collect payments, and manage pending invoices.</p>
      </div>

      {/* Finance Overview KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Billed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-[#0F3460] rounded-xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Billed</span>
            <span className="text-2xl font-black text-slate-850 block">${metrics.totalBilled.toFixed(2)}</span>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Collected</span>
            <span className="text-2xl font-black text-emerald-600 block">${metrics.totalCollected.toFixed(2)}</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Outstanding Balances</span>
            <span className="text-2xl font-black text-amber-600 block">${metrics.totalOutstanding.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Invoice filtering and ledger table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Table Filter Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice State</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F3460] text-sm font-semibold"
            >
              <option value="">All Invoices</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Billed Date</th>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Paid Amount</th>
                <th className="px-6 py-4">Outstanding Due</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-6 py-4"><div className="h-6 bg-slate-150 rounded w-full"></div></td>
                  </tr>
                ))
              ) : bills.length > 0 ? (
                bills.map((bill) => {
                  const total = parseFloat(bill.total_amount.toString());
                  const paid = parseFloat(bill.paid_amount.toString());
                  const balance = total - paid;

                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-xs text-slate-450">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-650">INV-{1000 + bill.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {bill.patient ? `${bill.patient.first_name} ${bill.patient.last_name}` : 'N/A'}
                        <span className="font-mono text-[10px] text-slate-400 block mt-0.5">{bill.patient?.mrn}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold">${total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-emerald-650 font-medium">${paid.toFixed(2)}</td>
                      <td className={`px-6 py-4 font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        ${balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 capitalize">{bill.payment_method || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                          bill.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                          bill.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {balance > 0 ? (
                          <button
                            onClick={() => openPaymentModal(bill)}
                            className="px-3.5 py-1.5 bg-[#0F3460] hover:bg-[#1B4D8A] text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                          >
                            Collect
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold bg-slate-100 px-2 py-1 rounded-lg">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-light">
                    No active invoices match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Payment Modal Dialog */}
      {paymentModalOpen && selectedBill && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-600" />
                <span>Invoice Payment Collection</span>
              </h2>
              <button onClick={closePaymentModal} className="text-slate-400 hover:text-slate-650">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Number:</span>
                  <span className="font-mono font-bold text-slate-800">INV-{1000 + selectedBill.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-800">
                    {selectedBill.patient?.first_name} {selectedBill.patient?.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Balance:</span>
                  <span className="text-amber-600 font-bold">
                    ${(parseFloat(selectedBill.total_amount.toString()) - parseFloat(selectedBill.paid_amount.toString())).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Payment Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={(parseFloat(selectedBill.total_amount.toString()) - parseFloat(selectedBill.paid_amount.toString())).toFixed(2)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700 bg-white"
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Insurance Claim">Insurance Claim</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-650 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  {paymentMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Record Payment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
