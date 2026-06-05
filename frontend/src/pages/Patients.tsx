import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Edit2, 
  Eye, 
  X, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight,
  UserCheck
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

interface PatientsResponse {
  patients: Patient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const Patients: React.FC = () => {
  const { user, api } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'Male',
    blood_group: 'A+',
    phone: '',
    email: '',
    address: '',
    emergency_contact: '',
    insurance_id: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const canMutate = ['admin', 'doctor', 'nurse'].includes(user?.role || '');

  // Fetch Patients Query
  const { data, isLoading } = useQuery<PatientsResponse>({
    queryKey: ['patients', page, search],
    queryFn: async () => {
      const res = await api.get('/api/patients', {
        params: { page, limit: 10, search }
      });
      return res.data;
    }
  });

  // Create Patient Mutation
  const createMutation = useMutation({
    mutationFn: async (newPatient: typeof formData) => {
      return api.post('/api/patients', newPatient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      triggerToast('success', 'Patient registered successfully!');
      closeModal();
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Failed to register patient';
      triggerToast('error', message);
    }
  });

  // Update Patient Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return api.put(`/api/patients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      triggerToast('success', 'Patient details updated!');
      closeModal();
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Failed to update patient details';
      triggerToast('error', message);
    }
  });

  const openAddModal = () => {
    setEditingPatient(null);
    setFormData({
      first_name: '',
      last_name: '',
      dob: '',
      gender: 'Male',
      blood_group: 'A+',
      phone: '',
      email: '',
      address: '',
      emergency_contact: '',
      insurance_id: ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      first_name: patient.first_name,
      last_name: patient.last_name,
      dob: patient.dob,
      gender: patient.gender,
      blood_group: patient.blood_group || 'A+',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      emergency_contact: patient.emergency_contact || '',
      insurance_id: patient.insurance_id || ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPatient(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.dob) errors.dob = 'Date of birth is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingPatient) {
      updateMutation.mutate({ id: editingPatient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page to 1 when searching
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Patients Ledger</h1>
          <p className="text-slate-500 mt-1">Manage demographic files and clinical chart indexes.</p>
        </div>
        {canMutate && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-900/10"
          >
            <UserPlus size={18} />
            <span>Register Patient</span>
          </button>
        )}
      </div>

      {/* Search and Table Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search by Patient Name or MRN..."
              value={search}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">MRN</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Age / DOB</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Contact Phone</th>
                <th className="px-6 py-4">Insurance ID</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                // Loading Skeletons
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-200 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : data?.patients && data.patients.length > 0 ? (
                data.patients.map((patient) => {
                  // Calculate age
                  const birthDate = new Date(patient.dob);
                  const difference = Date.now() - birthDate.getTime();
                  const age = Math.floor(difference / (1000 * 60 * 60 * 24 * 365.25));

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{patient.mrn}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {patient.first_name} {patient.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span>{age} yrs</span>
                        <span className="text-slate-400 block text-[10px]">{patient.dob}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                          {patient.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{patient.phone || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-mono text-xs">{patient.insurance_id || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                            title="View Records Detail"
                          >
                            <Eye size={16} />
                          </Link>
                          {canMutate && (
                            <button
                              onClick={() => openEditModal(patient)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-850 rounded-lg transition-colors"
                              title="Edit Patient"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-light">
                    No patient records found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data && data.totalPages > 1 && (
          <div className="p-5 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500 font-light">
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

      {/* Add / Edit Patient Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserCheck size={20} className="text-[#0F3460]" />
                <span>{editingPatient ? 'Update Patient File' : 'Register New Patient'}</span>
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                    className={`block w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] ${
                      formErrors.first_name ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.first_name && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.first_name}</span>}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
                    className={`block w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] ${
                      formErrors.last_name ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.last_name && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.last_name}</span>}
                </div>

                {/* DOB */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData(p => ({ ...p, dob: e.target.value }))}
                    className={`block w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] ${
                      formErrors.dob ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.dob && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.dob}</span>}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData(p => ({ ...p, blood_group: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                {/* Insurance ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Insurance Policy ID</label>
                  <input
                    type="text"
                    value={formData.insurance_id}
                    onChange={(e) => setFormData(p => ({ ...p, insurance_id: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                    placeholder="INS-XXXXXX"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                    placeholder="555-0100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    className={`block w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] ${
                      formErrors.email ? 'border-red-400' : 'border-slate-200'
                    }`}
                    placeholder="patient@example.com"
                  />
                  {formErrors.email && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.email}</span>}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  placeholder="Street, City, State"
                ></textarea>
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Emergency Contact Details</label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(p => ({ ...p, emergency_contact: e.target.value }))}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460]"
                  placeholder="Name (Relation) - Phone"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-650 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>{editingPatient ? 'Save Changes' : 'Register'}</span>
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

export default Patients;
