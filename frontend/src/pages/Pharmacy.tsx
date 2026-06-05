import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  Pill, 
  Plus, 
  AlertTriangle, 
  X,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { triggerToast } from '../components/Layout';

interface Drug {
  id: number;
  drug_name: string;
  generic_name: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  price: number;
  expiry_date: string;
}

interface PendingPrescription {
  id: number;
  record_id: number;
  drug_id: number;
  dosage: string;
  frequency: string;
  duration_days: number;
  dispensed: boolean;
  created_at: string;
  drug?: Drug;
  medicalRecord?: {
    visit_date: string;
    patient?: {
      id: number;
      mrn: string;
      first_name: string;
      last_name: string;
    };
    doctor?: {
      id: number;
      name: string;
    };
  };
}

const Pharmacy: React.FC = () => {
  const { user, api } = useAuth();
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'prescriptions'>('inventory');
  const [modalOpen, setModalOpen] = useState(false);

  // Add Drug Form State
  const [formData, setFormData] = useState({
    drug_name: '',
    generic_name: '',
    quantity: '',
    unit: 'Tablets',
    reorder_level: '10',
    price: '',
    expiry_date: ''
  });

  const isPharmacistOrAdmin = ['admin', 'pharmacist'].includes(user?.role || '');

  // 1. Fetch Inventory Query
  const { data: inventory = [], isLoading: isInventoryLoading } = useQuery<Drug[]>({
    queryKey: ['pharmacyInventory'],
    queryFn: async () => {
      const res = await api.get('/api/pharmacy/inventory');
      return res.data;
    }
  });

  // 2. Fetch Pending Prescriptions Query
  const { data: pendingRx = [], isLoading: isRxLoading } = useQuery<PendingPrescription[]>({
    queryKey: ['pendingPrescriptions'],
    queryFn: async () => {
      const res = await api.get('/api/pharmacy/prescriptions/pending');
      return res.data;
    }
  });

  // 3. Add Drug Mutation
  const addDrugMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/api/pharmacy/inventory', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyInventory'] });
      triggerToast('success', 'Drug successfully added to inventory!');
      setModalOpen(false);
      // Reset form
      setFormData({
        drug_name: '',
        generic_name: '',
        quantity: '',
        unit: 'Tablets',
        reorder_level: '10',
        price: '',
        expiry_date: ''
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to add drug';
      triggerToast('error', msg);
    }
  });

  // 4. Dispense Rx Mutation
  const dispenseMutation = useMutation({
    mutationFn: async (rxId: number) => {
      return api.put(`/api/pharmacy/prescriptions/${rxId}/dispense`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingPrescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyInventory'] });
      triggerToast('success', 'Prescription dispensed and inventory decremented!');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Dispensing failed';
      triggerToast('error', msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantity: parseInt(formData.quantity, 10),
      reorder_level: parseInt(formData.reorder_level, 10),
      price: parseFloat(formData.price)
    };

    if (isNaN(payload.quantity) || isNaN(payload.price)) {
      triggerToast('error', 'Please fill all required inputs correctly');
      return;
    }

    addDrugMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Pill className="text-[#0F3460]" size={28} />
            <span>Pharmacy Portal</span>
          </h1>
          <p className="text-slate-500 mt-1">Dispense prescription orders and monitor drug inventory levels.</p>
        </div>
        {activeSubTab === 'inventory' && isPharmacistOrAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-900/10"
          >
            <Plus size={18} />
            <span>Add Stock Item</span>
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`px-5 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeSubTab === 'inventory' 
              ? 'border-[#0F3460] text-[#0F3460]' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Drug Inventory List
        </button>
        <button
          onClick={() => setActiveSubTab('prescriptions')}
          className={`px-5 py-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 ${
            activeSubTab === 'prescriptions' 
              ? 'border-[#0F3460] text-[#0F3460]' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <span>Pending Prescriptions</span>
          {pendingRx.length > 0 && (
            <span className="bg-red-100 text-red-650 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border border-red-200">
              {pendingRx.length}
            </span>
          )}
        </button>
      </div>

      {/* Content workspace */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Inventory View */}
        {activeSubTab === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Drug Item</th>
                  <th className="px-6 py-4">Generic name</th>
                  <th className="px-6 py-4">Quantity Available</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">Safety Reorder Lvl</th>
                  <th className="px-6 py-4">Price ($)</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Safety Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                {isInventoryLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-4"><div className="h-6 bg-slate-150 rounded w-full"></div></td>
                    </tr>
                  ))
                ) : inventory.length > 0 ? (
                  inventory.map((drug) => {
                    const isLowStock = drug.quantity <= drug.reorder_level;
                    const isExpired = new Date(drug.expiry_date) < new Date();

                    return (
                      <tr key={drug.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-800">{drug.drug_name}</td>
                        <td className="px-6 py-4 font-light">{drug.generic_name}</td>
                        <td className={`px-6 py-4 font-mono font-bold ${isLowStock ? 'text-red-650' : 'text-slate-700'}`}>
                          {drug.quantity}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{drug.unit}</td>
                        <td className="px-6 py-4 font-mono text-slate-400">{drug.reorder_level}</td>
                        <td className="px-6 py-4 font-mono font-semibold">${parseFloat(drug.price.toString()).toFixed(2)}</td>
                        <td className={`px-6 py-4 text-xs ${isExpired ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                          {drug.expiry_date}
                        </td>
                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="flex items-center gap-1.5 text-xs text-red-650 font-bold bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 w-fit">
                              <AlertTriangle size={12} />
                              Expired
                            </span>
                          ) : isLowStock ? (
                            <span className="flex items-center gap-1.5 text-xs text-amber-650 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 w-fit">
                              <AlertCircle size={12} />
                              Restock Required
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-250 w-fit">
                              Adequate Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-light">
                      No medications registered in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pending Prescriptions View */}
        {activeSubTab === 'prescriptions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Date Prescribed</th>
                  <th className="px-6 py-4">Patient MRN</th>
                  <th className="px-6 py-4">Patient Name</th>
                  <th className="px-6 py-4">Doctor</th>
                  <th className="px-6 py-4">Medication Ordered</th>
                  <th className="px-6 py-4">Instructions (Dosage/Frequency)</th>
                  <th className="px-6 py-4">Required qty</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                {isRxLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-4"><div className="h-6 bg-slate-150 rounded w-full"></div></td>
                    </tr>
                  ))
                ) : pendingRx.length > 0 ? (
                  pendingRx.map((rx) => {
                    const patient = rx.medicalRecord?.patient;
                    const doc = rx.medicalRecord?.doctor;
                    const drugStock = rx.drug?.quantity || 0;
                    const isOutOfStock = drugStock < rx.duration_days;

                    return (
                      <tr key={rx.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {rx.medicalRecord?.visit_date}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-blue-600">{patient?.mrn}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {patient?.first_name} {patient?.last_name}
                        </td>
                        <td className="px-6 py-4 text-slate-650 font-medium">Dr. {doc?.name}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-850 block">{rx.drug?.drug_name}</span>
                          <span className="text-xs text-slate-400 block font-light">Available Stock: {drugStock} units</span>
                        </td>
                        <td className="px-6 py-4">
                          <span>{rx.dosage}</span>
                          <span className="text-xs text-slate-400 block font-light">{rx.frequency}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold">{rx.duration_days} units</td>
                        <td className="px-6 py-4 text-right">
                          {isPharmacistOrAdmin ? (
                            <button
                              onClick={() => {
                                if (isOutOfStock) {
                                  triggerToast('error', 'Cannot dispense: Insufficient inventory stock.');
                                  return;
                                }
                                dispenseMutation.mutate(rx.id);
                              }}
                              disabled={dispenseMutation.isPending}
                              className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition-all ${
                                isOutOfStock 
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                  : 'bg-[#0F3460] hover:bg-[#1B4D8A] text-white'
                              }`}
                            >
                              {isOutOfStock ? 'Short Supply' : 'Dispense'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-light">Pharmacist Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-light flex flex-col items-center gap-2 justify-center w-full">
                      <FileCheck size={40} className="text-slate-300 mx-auto" />
                      <span>No pending prescription orders in queue.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Stock Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Pill size={20} className="text-[#0F3460]" />
                <span>Register New Medication</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-650">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Acetaminophen 500mg"
                  value={formData.drug_name}
                  onChange={(e) => setFormData(p => ({ ...p, drug_name: e.target.value }))}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Generic Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Paracetamol"
                  value={formData.generic_name}
                  onChange={(e) => setFormData(p => ({ ...p, generic_name: e.target.value }))}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Initial Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="100"
                    value={formData.quantity}
                    onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Stock Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(p => ({ ...p, unit: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  >
                    <option value="Tablets">Tablets</option>
                    <option value="Capsules">Capsules</option>
                    <option value="Inhalers">Inhalers</option>
                    <option value="Bottles">Bottles (Liquid)</option>
                    <option value="Tubes">Tubes (Ointment)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Safety Limit *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="20"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData(p => ({ ...p, reorder_level: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Unit Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.25"
                    value={formData.price}
                    onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={formData.expiry_date}
                  onChange={(e) => setFormData(p => ({ ...p, expiry_date: e.target.value }))}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-650 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addDrugMutation.isPending}
                  className="px-5 py-2 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  {addDrugMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Register Drug</span>
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

export default Pharmacy;
