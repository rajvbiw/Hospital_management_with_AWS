import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  X, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  FileCheck,
  ChevronRight
} from 'lucide-react';

import { triggerToast } from '../components/Layout';

interface Doctor {
  id: number;
  name: string;
  email: string;
}

interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  patient?: Patient;
  doctor?: Doctor;
}

const Appointments: React.FC = () => {
  const { user, api } = useAuth();
  const queryClient = useQueryClient();

  // Filters State
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Form States
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const isNurseOrDoctorOrAdmin = ['admin', 'doctor', 'nurse'].includes(user?.role || '');

  // 1. Fetch Doctors list for filtering & dropdowns
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get('/api/appointments/doctors');
      return res.data;
    }
  });

  // 2. Fetch Patients list for scheduling dropdown (loads top 50 patients)
  const { data: patientsData } = useQuery<{ patients: Patient[] }>({
    queryKey: ['patientsList'],
    queryFn: async () => {
      const res = await api.get('/api/patients', { params: { limit: 50 } });
      return res.data;
    },
    enabled: modalOpen // Fetch only when modal is opened to save network load
  });
  const patients = patientsData?.patients || [];

  // 3. Fetch Appointments Query
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', filterDate, filterDoctor, filterStatus],
    queryFn: async () => {
      const res = await api.get('/api/appointments', {
        params: {
          date: filterDate,
          doctor_id: filterDoctor || undefined,
          status: filterStatus || undefined
        }
      });
      return res.data;
    }
  });

  // 4. Create Appointment Mutation
  const createMutation = useMutation({
    mutationFn: async (newAppt: { patient_id: number; doctor_id: number; scheduled_at: string; notes: string }) => {
      return api.post('/api/appointments', newAppt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      triggerToast('success', 'Appointment booked successfully!');
      closeModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to book appointment';
      triggerToast('error', msg);
    }
  });

  // 5. Update Appointment Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'scheduled' | 'completed' | 'cancelled' }) => {
      return api.put(`/api/appointments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      triggerToast('success', 'Appointment status updated!');
      setSelectedAppointment(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update status';
      triggerToast('error', msg);
    }
  });

  // 6. Delete Appointment Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/api/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      triggerToast('success', 'Appointment cancelled and deleted!');
      setSelectedAppointment(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete appointment';
      triggerToast('error', msg);
    }
  });

  const openAddModal = () => {
    setPatientId('');
    setDoctorId(user?.role === 'doctor' ? user.id.toString() : '');
    setScheduledAt('');
    setNotes('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !scheduledAt) {
      triggerToast('error', 'Please fill all required fields');
      return;
    }

    createMutation.mutate({
      patient_id: parseInt(patientId, 10),
      doctor_id: parseInt(doctorId, 10),
      scheduled_at: new Date(scheduledAt).toISOString(),
      notes
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Clinic Schedule</h1>
          <p className="text-slate-500 mt-1">Book and monitor patient check-ins and physician logs.</p>
        </div>
        {isNurseOrDoctorOrAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-900/10"
          >
            <Plus size={18} />
            <span>Book Appointment</span>
          </button>
        )}
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F3460] text-sm"
            />
          </div>

          {/* Doctor filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doctor</span>
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F3460] text-sm"
            >
              <option value="">All Doctors</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F3460] text-sm"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => {
            setFilterDate(new Date().toISOString().split('T')[0]);
            setFilterDoctor('');
            setFilterStatus('');
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          Reset Filters
        </button>
      </div>

      {/* Main Grid: appointments and details drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Appointments List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[50vh]">
          <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon size={18} className="text-[#0F3460]" />
              <span>Visits Listing</span>
            </h3>
            <span className="text-xs bg-slate-200 text-slate-650 px-2 py-0.5 rounded-full font-bold">
              {appointments.length} appointments
            </span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-16 bg-slate-100 rounded-xl"></div>
              ))}
            </div>
          ) : appointments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {appointments.map((appt) => {
                const apptTime = new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isSelected = selectedAppointment?.id === appt.id;

                return (
                  <div 
                    key={appt.id}
                    onClick={() => setSelectedAppointment(appt)}
                    className={`p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-blue-50/10 transition-colors ${
                      isSelected ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Scheduled Time node */}
                      <div className="flex flex-col items-center justify-center bg-blue-50 text-[#0F3460] font-bold p-3 rounded-xl border border-blue-100 w-16 h-16 shrink-0">
                        <Clock size={16} className="mb-1" />
                        <span className="text-xs">{apptTime}</span>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">
                          {appt.patient?.first_name} {appt.patient?.last_name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="font-mono text-[10px] font-semibold bg-slate-100 border px-1.5 py-0.5 rounded">
                            {appt.patient?.mrn}
                          </span>
                          <span>•</span>
                          <span>Dr. {appt.doctor?.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        appt.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        appt.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {appt.status}
                      </span>
                      <ChevronRight className="text-slate-300" size={20} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-light flex flex-col items-center gap-3 justify-center">
              <CalendarIcon size={40} className="text-slate-300" />
              <span>No appointments scheduled on this day.</span>
            </div>
          )}
        </div>

        {/* Selected Appointment detail card / instructions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[30vh]">
          {selectedAppointment ? (
            <div className="space-y-5 animate-fade-in">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Visit Details</span>
                <h3 className="text-xl font-black text-slate-800 mt-1">
                  {selectedAppointment.patient?.first_name} {selectedAppointment.patient?.last_name}
                </h3>
                <span className="font-mono text-xs font-bold text-blue-600 block mt-1">{selectedAppointment.patient?.mrn}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-450">Physician:</span>
                  <span className="font-semibold text-slate-700">{selectedAppointment.doctor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Date & Time:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(selectedAppointment.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Status:</span>
                  <span className="font-bold text-[#0F3460] capitalize">{selectedAppointment.status}</span>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Check-in Notes</span>
                  <p className="text-sm text-slate-600 bg-slate-50/50 p-3 rounded-lg border border-slate-100 font-light">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* Status Actions */}
              {isNurseOrDoctorOrAdmin && (
                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  {selectedAppointment.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: selectedAppointment.id, status: 'completed' })}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
                      >
                        <CheckCircle size={14} />
                        <span>Check In (Complete)</span>
                      </button>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: selectedAppointment.id, status: 'cancelled' })}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
                      >
                        <AlertCircle size={14} />
                        <span>Cancel Visit</span>
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this appointment record permanently?')) {
                        deleteMutation.mutate(selectedAppointment.id);
                      }
                    }}
                    className="flex items-center gap-1.5 bg-red-550 hover:bg-red-700 text-red-50 hover:text-white border border-red-200 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all ml-auto"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="my-auto text-center text-slate-400 font-light flex flex-col items-center gap-2 justify-center py-12">
              <FileCheck size={36} className="text-slate-300" />
              <span>Select an appointment to inspect check-in actions and status controls.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Appointment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon size={20} className="text-[#0F3460]" />
                <span>Book New Appointment</span>
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-650">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Patient *</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assigned Physician *</label>
                <select
                  required
                  value={doctorId}
                  disabled={user?.role === 'doctor'} // Doctors book for themselves
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Schedule Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Booking Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for consultation, chief complaints..."
                  className="block w-full px-3 py-2.5 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3460] text-sm text-slate-700"
                ></textarea>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-650 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-[#0F3460] hover:bg-[#1B4D8A] text-white font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  {createMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Schedule</span>
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

export default Appointments;
