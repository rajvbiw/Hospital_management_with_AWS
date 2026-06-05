import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  FileText, 
  Pill, 
  CreditCard, 
  ArrowLeft,
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  DollarSign,
  X
} from 'lucide-react';
import { triggerToast } from '../components/Layout';

interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  blood_group: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact: string;
  insurance_id: string;
  created_at: string;
}

interface Prescription {
  id: number;
  record_id: number;
  drug_id: number;
  dosage: string;
  frequency: string;
  duration_days: number;
  dispensed: boolean;
  drug?: {
    id: number;
    drug_name: string;
    generic_name: string;
    price: number;
    unit: string;
  };
}

interface MedicalRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  visit_date: string;
  diagnosis: string;
  prescription: string;
  icd10_code: string;
  notes: string;
  created_at: string;
  doctor?: {
    id: number;
    name: string;
    email: string;
  };
  prescriptions?: Prescription[];
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
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, api } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'info' | 'records' | 'prescriptions' | 'billing'>('info');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  
  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');

  // Roles verification
  const isDoctorOrAdmin = ['admin', 'doctor'].includes(user?.role || '');
  const isPharmacistOrAdmin = ['admin', 'pharmacist'].includes(user?.role || '');
  const isBillingOrAdmin = ['admin', 'billing'].includes(user?.role || '');

  // 1. Fetch Patient Info Query
  const patientQuery = useQuery<Patient>({
    queryKey: ['patient', id],
    queryFn: async () => {
      const res = await api.get(`/api/patients/${id}`);
      return res.data;
    }
  });

  // 2. Fetch Patient Medical Records Query
  const recordsQuery = useQuery<MedicalRecord[]>({
    queryKey: ['patientRecords', id],
    queryFn: async () => {
      const res = await api.get(`/api/patients/${id}/records`);
      return res.data;
    }
  });

  // 3. Fetch Patient Billing Query
  const billingQuery = useQuery<Bill[]>({
    queryKey: ['patientBilling', id],
    queryFn: async () => {
      const res = await api.get(`/api/patients/${id}/billing`);
      return res.data;
    }
  });

  // 4. Dispense Prescription Mutation
  const dispenseMutation = useMutation({
    mutationFn: async (rxId: number) => {
      return api.put(`/api/pharmacy/prescriptions/${rxId}/dispense`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientRecords', id] });
      triggerToast('success', 'Prescription dispensed and drug stock updated!');
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Dispensing failed';
      triggerToast('error', message);
    }
  });

  // 5. Submit Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ billId, amount, method }: { billId: number; amount: number; method: string }) => {
      return api.put(`/api/billing/${billId}/payment`, { amount, payment_method: method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientBilling', id] });
      triggerToast('success', 'Payment processed successfully!');
      closePaymentModal();
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Payment processing failed';
      triggerToast('error', message);
    }
  });

  const openPaymentModal = (bill: Bill) => {
    setSelectedBill(bill);
    const remaining = (parseFloat(bill.total_amount.toString()) - parseFloat(bill.paid_amount.toString())).toFixed(2);
    setPaymentAmount(remaining);
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

  const isLoading = patientQuery.isLoading || recordsQuery.isLoading || billingQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-24"></div>
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="h-10 bg-slate-200 rounded w-1/2"></div>
        <div className="h-80 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (patientQuery.isError || !patientQuery.data) {
    return (
      <div className="text-center p-8 bg-white border border-red-200 text-red-600 rounded-2xl">
        <p className="font-semibold text-lg">Error loading patient folder.</p>
        <Link to="/patients" className="text-[#0F3460] font-semibold text-sm underline mt-2 block">
          Back to Patients List
        </Link>
      </div>
    );
  }

  const patient = patientQuery.data;
  const records = recordsQuery.data || [];
  const bills = billingQuery.data || [];

  // Extract all prescriptions from records
  const allPrescriptions = records.flatMap(rec => 
    (rec.prescriptions || []).map(rx => ({
      ...rx,
      visit_date: rec.visit_date,
      doctor_name: rec.doctor?.name || 'Unknown Doctor'
    }))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <div>
        <Link to="/patients" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-semibold transition-all">
          <ArrowLeft size={16} />
          <span>Patients Ledger</span>
        </Link>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-24 bg-blue-50/20 rounded-l-full blur-2xl"></div>
        <div className="flex items-center gap-4 z-10">
          <div className="h-14 w-14 bg-blue-50 text-[#0F3460] rounded-2xl flex items-center justify-center text-xl font-bold border border-blue-100">
            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-500">
              <span className="font-mono text-xs bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full border font-bold">
                {patient.mrn}
              </span>
              <span>•</span>
              <span className="capitalize">{patient.gender}</span>
              <span>•</span>
              <span>Blood Group: <strong className="text-slate-700">{patient.blood_group || 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {/* Doctor Quick Actions */}
        {isDoctorOrAdmin && (
          <div className="z-10">
            <Link
              to={`/records/new?patient_id=${patient.id}`}
              className="flex items-center gap-2 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              <Plus size={16} />
              <span>Create Consultation Record</span>
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          { id: 'info', label: 'Patient Information', icon: User },
          { id: 'records', label: 'Medical History', icon: FileText },
          { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
          { id: 'billing', label: 'Billing & Invoices', icon: CreditCard }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                isActive 
                  ? 'border-[#0F3460] text-[#0F3460]' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[40vh]">
        
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Demographics</h3>
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Date of Birth</span>
                    <span className="font-semibold text-slate-700">{patient.dob}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Gender</span>
                    <span className="font-semibold text-slate-700">{patient.gender}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Blood Group</span>
                    <span className="font-semibold text-slate-700">{patient.blood_group || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Contact Details</h3>
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Phone</span>
                    <span className="font-semibold text-slate-700">{patient.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Email</span>
                    <span className="font-semibold text-slate-700 truncate max-w-xs">{patient.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Address</span>
                    <span className="font-semibold text-slate-700 max-w-[200px] text-right">{patient.address || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Emergency Contact</h3>
                <div className="bg-slate-50 p-4 rounded-xl text-sm font-semibold text-slate-700">
                  {patient.emergency_contact || 'No emergency contact registered.'}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Insurance Details</h3>
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Policy Holder ID</span>
                    <span className="font-semibold font-mono text-slate-700">{patient.insurance_id || 'Self Pay (No Insurance)'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Chronological Visit Records</h3>
            {records.length > 0 ? (
              <div className="relative border-l-2 border-slate-100 pl-6 space-y-8 ml-3">
                {records.map((rec) => (
                  <div key={rec.id} className="relative">
                    {/* Timeline Node dot */}
                    <div className="absolute -left-[31px] top-1 bg-white p-1 border-2 border-[#0F3460] rounded-full text-[#0F3460]">
                      <div className="w-1.5 h-1.5 bg-[#0F3460] rounded-full"></div>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <Calendar size={14} />
                          <span>{rec.visit_date}</span>
                          <span>•</span>
                          <span>Consultant: <strong className="text-slate-650">{rec.doctor?.name}</strong></span>
                        </div>
                        <span className="font-mono text-xs font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-100">
                          ICD-10: {rec.icd10_code}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg mb-2">{rec.diagnosis}</h4>
                      <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{rec.notes}</p>
                      
                      {rec.prescriptions && rec.prescriptions.length > 0 && (
                        <div className="mt-3 border-t border-slate-150 pt-3">
                          <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Linked Prescriptions</h5>
                          <div className="space-y-2">
                            {rec.prescriptions.map(rx => (
                              <div key={rx.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 text-sm">
                                <div>
                                  <span className="font-semibold text-slate-700">{rx.drug?.drug_name}</span>
                                  <span className="text-xs text-slate-450 block">{rx.dosage} • {rx.frequency} ({rx.duration_days} days)</span>
                                </div>
                                <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  rx.dispensed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {rx.dispensed ? <CheckCircle size={12} /> : <Clock size={12} />}
                                  {rx.dispensed ? 'Dispensed' : 'Pending Pharmacy'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-light">
                No past visit records logged.
              </div>
            )}
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Patient Prescription Orders</h3>
            {allPrescriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-3">Prescribed On</th>
                      <th className="px-5 py-3">Prescribing Doctor</th>
                      <th className="px-5 py-3">Drug name</th>
                      <th className="px-5 py-3">Instructional Dosage</th>
                      <th className="px-5 py-3">Dispense State</th>
                      {isPharmacistOrAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {allPrescriptions.map(rx => (
                      <tr key={rx.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 text-xs text-slate-500">{rx.visit_date}</td>
                        <td className="px-5 py-3.5 font-medium">{rx.doctor_name}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-800">{rx.drug?.drug_name}</span>
                          <span className="text-xs text-slate-400 block font-light">{rx.drug?.generic_name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span>{rx.dosage}</span>
                          <span className="text-xs text-slate-400 block font-light">{rx.frequency} for {rx.duration_days} days</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            rx.dispensed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {rx.dispensed ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {rx.dispensed ? 'Dispensed' : 'Pending'}
                          </span>
                        </td>
                        {isPharmacistOrAdmin && (
                          <td className="px-5 py-3.5 text-right">
                            {!rx.dispensed ? (
                              <button
                                onClick={() => dispenseMutation.mutate(rx.id)}
                                disabled={dispenseMutation.isPending}
                                className="px-3 py-1.5 bg-[#0F3460] hover:bg-[#1B4D8A] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                              >
                                Dispense Medicine
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Ready</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-light">
                No prescription items found.
              </div>
            )}
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoices & Statements</h3>
            {bills.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-3">Billed Date</th>
                      <th className="px-5 py-3">Invoice ID</th>
                      <th className="px-5 py-3">Total Cost</th>
                      <th className="px-5 py-3">Paid Amount</th>
                      <th className="px-5 py-3">Remaining Balance</th>
                      <th className="px-5 py-3">Payment Method</th>
                      <th className="px-5 py-3">Status</th>
                      {isBillingOrAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {bills.map((bill) => {
                      const total = parseFloat(bill.total_amount.toString());
                      const paid = parseFloat(bill.paid_amount.toString());
                      const balance = total - paid;

                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {new Date(bill.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs font-semibold">INV-{1000 + bill.id}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-800">${total.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-emerald-600 font-medium">${paid.toFixed(2)}</td>
                          <td className={`px-5 py-3.5 font-semibold ${balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            ${balance.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 capitalize">{bill.payment_method || 'N/A'}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              bill.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                              bill.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {bill.status}
                            </span>
                          </td>
                          {isBillingOrAdmin && (
                            <td className="px-5 py-3.5 text-right">
                              {balance > 0 ? (
                                <button
                                  onClick={() => openPaymentModal(bill)}
                                  className="px-3 py-1.5 bg-[#0F3460] hover:bg-[#1B4D8A] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                                >
                                  Collect Payment
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Settled</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-light">
                No billing records logged for this patient.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collect Payment Modal */}
      {paymentModalOpen && selectedBill && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-600" />
                <span>Record Invoice Payment</span>
              </h2>
              <button onClick={closePaymentModal} className="text-slate-400 hover:text-slate-650">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice ID:</span>
                  <span className="font-mono font-bold text-slate-800">INV-{1000 + selectedBill.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill Cost:</span>
                  <span className="font-bold text-slate-800">${parseFloat(selectedBill.total_amount.toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Cleared:</span>
                  <span className="text-emerald-600 font-bold">${parseFloat(selectedBill.paid_amount.toString()).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={(parseFloat(selectedBill.total_amount.toString()) - parseFloat(selectedBill.paid_amount.toString())).toFixed(2)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
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
                    <span>Submit Payment</span>
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

export default PatientDetail;
