const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Appointment, Patient, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// Helper middleware for validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Apply authentication to all appointment routes
router.use(authenticateToken);

// @route   GET /api/appointments/doctors
// @desc    Get all active doctor users
// @access  Admin, Doctor, Nurse, Billing
router.get('/doctors', authorize(['admin', 'doctor', 'nurse', 'billing']), async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: 'doctor' },
      attributes: ['id', 'name', 'email']
    });
    res.json(doctors);
  } catch (error) {
    console.error('Fetch doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments
// @desc    Get appointments, filter by date, doctor, status
// @access  Admin, Doctor, Nurse, Billing
router.get('/', authorize(['admin', 'doctor', 'nurse', 'billing']), async (req, res) => {
  const { doctor_id, date, status } = req.query;
  const whereCondition = {};

  try {
    if (doctor_id) {
      whereCondition.doctor_id = doctor_id;
    }

    if (status) {
      whereCondition.status = status;
    }

    if (date) {
      // Fetch appointments for the full day (00:00:00 to 23:59:59)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      whereCondition.scheduled_at = {
        [Op.between]: [startDate, endDate]
      };
    }

    const appointments = await Appointment.findAll({
      where: whereCondition,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] }
      ],
      order: [['scheduled_at', 'ASC']]
    });

    res.json(appointments);
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/appointments
// @desc    Schedule a new appointment
// @access  Admin, Doctor, Nurse
router.post('/', [
  authorize(['admin', 'doctor', 'nurse']),
  body('patient_id').isInt().withMessage('Valid patient ID is required'),
  body('doctor_id').isInt().withMessage('Valid doctor ID is required'),
  body('scheduled_at').isISO8601().withMessage('Valid ISO scheduled date/time is required'),
  body('status').optional().isIn(['scheduled', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().trim()
], validate, async (req, res) => {
  const { patient_id, doctor_id, scheduled_at, status, notes } = req.body;

  try {
    // Check if patient exists
    const patientExists = await Patient.findByPk(patient_id);
    if (!patientExists) {
      return res.status(400).json({ message: 'Patient does not exist' });
    }

    // Check if doctor exists and role is indeed doctor
    const doctorExists = await User.findOne({ where: { id: doctor_id, role: 'doctor' } });
    if (!doctorExists) {
      return res.status(400).json({ message: 'Doctor does not exist' });
    }

    const appointment = await Appointment.create({
      patient_id,
      doctor_id,
      scheduled_at,
      status: status || 'scheduled',
      notes
    });

    // Fetch the created appointment with relations for immediate display updating in frontend
    const fullAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] }
      ]
    });

    req.auditRecordId = appointment.id; // pass to audit logger
    res.status(201).json(fullAppointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment details or status
// @access  Admin, Doctor, Nurse
router.put('/:id', [
  authorize(['admin', 'doctor', 'nurse']),
  body('scheduled_at').optional().isISO8601().withMessage('Valid ISO scheduled date/time is required'),
  body('status').optional().isIn(['scheduled', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().trim()
], validate, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await appointment.update(req.body);

    const fullAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] }
      ]
    });

    req.auditRecordId = appointment.id; // pass to audit logger
    res.json(fullAppointment);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Delete/Cancel appointment
// @access  Admin, Doctor, Nurse
router.delete('/:id', authorize(['admin', 'doctor', 'nurse']), async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await appointment.destroy();
    req.auditRecordId = req.params.id; // pass to audit logger
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
