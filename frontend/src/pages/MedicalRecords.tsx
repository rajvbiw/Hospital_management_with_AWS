import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  User as UserIcon, 
  Search, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Activity,
  HeartPulse,
  Pill
} from 'lucide-react';
import { triggerToast } from '../components/Layout';

interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
}

interface Drug {
  id: number;
  drug_name: string;
  generic_name: string;
  quantity: number;
  unit: string;
}

interface RxLineItem {
  drug_id: string;
  dosage: string;
  frequency: string;
  duration_days: string;
}

const ICD10_DB = [
  { code: 'I10', diagnosis: 'Essential (primary) hypertension' },
  { code: 'E11.9', diagnosis: 'Type 2 diabetes mellitus without complications' },
  { code: 'J06.9', diagnosis: 'Acute upper respiratory infection, unspecified' },
  { code: 'E78.5', diagnosis: 'Hyperlipidemia, unspecified' },
  { code: 'K21.9', diagnosis: 'Gastro-esophageal reflux disease without esophagitis' },
  { code: 'M54.5', diagnosis: 'Low back pain, unspecified' },
  { code: 'J45.909', diagnosis: 'Unspecified asthma, uncomplicated' },
  { code: 'N39.0', diagnosis: 'Urinary tract infection, site not specified' },
  { code: 'F41.1', diagnosis: 'Generalized anxiety disorder' },
  { code: 'G47.00', diagnosis: 'Insomnia, unspecified' }
];

const MedicalRecords: React.FC = () => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patient_id') || '';

  // Form States
  const [patientId, setPatientId] = useState(preselectedPatientId);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosis, setDiagnosis] = useState('');
  const [icdSearch, setIcdSearch] = useState('');
  const [showIcdSuggestions, setShowIcdSuggestions] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Prescriptions List
  const [rxList, setRxList] = useState<RxLineItem[]>([]);

  // 1. Fetch Patients list for dropdown
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['patientsSelect'],
    queryFn: async () => {
      const res = await api.get('/api/patients', { params: { limit: 100 } });
      return res.data.patients || [];
    }
  });

  // 2. Fetch Pharmacy drugs list for prescription selection
  const { data: drugs = [] } = useQuery<Drug[]>({
    queryKey: ['drugsSelect'],
    queryFn: async () => {
      const res = await api.get('/api/pharmacy/inventory');
      return res.data || [];
    }
  });

  // 3. Create Medical Record Mutation
  const createRecordMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/api/records', payload);
    },
    onSuccess: (_data) => {
      triggerToast('success', 'Medical record & prescriptions logged!');
      // Navigate to patient folder
      navigate(`/patients/${patientId}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to submit medical record';
      triggerToast('error', msg);
    }
  });

  // ICD-10 suggestions filtering
  const filteredSuggestions = ICD10_DB.filter(item => 
    item.code.toLowerCase().includes(icdSearch.toLowerCase()) || 
    item.diagnosis.toLowerCase().includes(icdSearch.toLowerCase())
  );

  const handleSelectIcd = (item: typeof ICD10_DB[0]) => {
    setIcdSearch(item.code);
    setDiagnosis(item.diagnosis);
    setShowIcdSuggestions(false);
  };

  const handleAddRx = () => {
    setRxList(prev => [...prev, { drug_id: '', dosage: '1 tablet', frequency: 'Daily', duration_days: '30' }]);
  };

  const handleRemoveRx = (index: number) => {
    setRxList(prev => prev.filter((_, i) => i !== index));
  };

  const handleRxChange = (index: number, field: keyof RxLineItem, value: string) => {
    setRxList(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !visitDate || !diagnosis || !icdSearch) {
      triggerToast('error', 'Please fill in all clinical required fields.');
      return;
    }

    // Prepare payload
    const payload = {
      patient_id: parseInt(patientId, 10),
      doctor_id: user?.id,
      visit_date: visitDate,
      diagnosis,
      icd10_code: icdSearch,
      notes,
      prescription: rxList.map(rx => {
        const drug = drugs.find(d => d.id === parseInt(rx.drug_id, 10));
        return `${drug?.drug_name || 'Medicine'} - ${rx.dosage} ${rx.frequency} for ${rx.duration_days} days`;
      }).join('; '),
      prescriptionsList: rxList.map(rx => ({
        drug_id: parseInt(rx.drug_id, 10),
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration_days: parseInt(rx.duration_days, 10)
      }))
    };

    createRecordMutation.mutate(payload);
  };

  // If page is accessed by non-clinical role
  if (user && !['admin', 'doctor'].includes(user.role)) {
    return (
      <div className="text-center p-8 bg-white border border-slate-100 rounded-2xl">
        <p className="font-semibold text-lg text-slate-800">Clinical Charts Restricted</p>
        <p className="text-sm mt-1 text-slate-500">Only Doctor and Admin accounts can log clinical consultation files.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Back button */}
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-semibold transition-all">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <HeartPulse className="text-[#0F3460]" size={28} />
          <span>Consultation Record Form</span>
        </h1>
        <p className="text-slate-500 mt-1">Record clinical diagnostics, symptoms, and order pharmacy prescriptions.</p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Patient and Date */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 mb-4 flex items-center gap-2">
            <UserIcon size={16} />
            <span>Consultation Demographics</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Select Patient *</label>
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={!!preselectedPatientId} // lock if passed via search param
                className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700 bg-white"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Visit Date *</label>
              <input
                type="date"
                required
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Clinical Diagnosis with ICD-10 Autocomplete */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 mb-4 flex items-center gap-2">
            <Activity size={16} />
            <span>Clinical Diagnostics & Charting</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ICD-10 autocomplete search box */}
            <div className="relative md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">ICD-10 Code *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Type code (e.g. I10)..."
                  value={icdSearch}
                  onFocus={() => setShowIcdSuggestions(true)}
                  onChange={(e) => {
                    setIcdSearch(e.target.value);
                    setShowIcdSuggestions(true);
                  }}
                  className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700 font-mono font-semibold"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-350">
                  <Search size={16} />
                </span>
              </div>

              {/* Suggestions Dropdown Card */}
              {showIcdSuggestions && icdSearch.length >= 0 && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowIcdSuggestions(false)}></div>
                  <div className="absolute left-0 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100 py-1">
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map(item => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleSelectIcd(item)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs transition-colors flex flex-col gap-0.5"
                        >
                          <span className="font-mono font-bold text-blue-650">{item.code}</span>
                          <span className="text-slate-600 font-medium">{item.diagnosis}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400 font-light">No ICD-10 code matched.</div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Diagnosis notes (derived or typed) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Primary Diagnosis Summary *</label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="E.g. Type 2 Diabetes Mellitus"
                className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Clinical Consultation Log Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record physical findings, vitals, subjective reports..."
              className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700"
            ></textarea>
          </div>
        </div>

        {/* Step 3: Specific Pharmacy prescriptions mapping */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Pill size={16} />
              <span>Medication Order Entries</span>
            </h3>
            <button
              type="button"
              onClick={handleAddRx}
              className="flex items-center gap-1.5 bg-blue-50 text-[#0F3460] hover:bg-[#0F3460] hover:text-white font-semibold text-xs px-3 py-1.5 rounded-lg border border-blue-150 transition-all"
            >
              <Plus size={14} />
              <span>Add Drug</span>
            </button>
          </div>

          {rxList.length > 0 ? (
            <div className="space-y-4">
              {rxList.map((rx, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-150 relative flex flex-col md:flex-row gap-3 items-end">
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRx(idx)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-150 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Drug select */}
                  <div className="w-full md:flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Drug name *</label>
                    <select
                      required
                      value={rx.drug_id}
                      onChange={(e) => handleRxChange(idx, 'drug_id', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    >
                      <option value="">-- Choose Medication --</option>
                      {drugs.map(drug => (
                        <option key={drug.id} value={drug.id}>
                          {drug.drug_name} ({drug.generic_name}) - Stock: {drug.quantity} {drug.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dosage instructions */}
                  <div className="w-full md:w-32">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dosage *</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g. 500mg, 1 pill"
                      value={rx.dosage}
                      onChange={(e) => handleRxChange(idx, 'dosage', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>

                  {/* Frequency */}
                  <div className="w-full md:w-40">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Frequency *</label>
                    <select
                      value={rx.frequency}
                      onChange={(e) => handleRxChange(idx, 'frequency', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                    >
                      <option value="Daily">Once Daily</option>
                      <option value="Twice Daily">Twice Daily</option>
                      <option value="Three Times Daily">Three Times Daily</option>
                      <option value="Nightly">Nightly</option>
                      <option value="As Needed">As Needed (PRN)</option>
                    </select>
                  </div>

                  {/* Duration days */}
                  <div className="w-full md:w-28">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Duration (days) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={rx.duration_days}
                      onChange={(e) => handleRxChange(idx, 'duration_days', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 font-light text-xs flex flex-col items-center gap-1">
              <span>No medications prescribed.</span>
              <span className="text-[10px] text-slate-400">Click "Add Drug" to prescribe pharmacy items to this patient.</span>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-650 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createRecordMutation.isPending}
            className="px-6 py-2.5 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            {createRecordMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Save consultation log</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MedicalRecords;
