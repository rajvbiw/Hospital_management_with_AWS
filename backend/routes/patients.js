const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Patient, MedicalRecord, Billing, User, Prescription, PharmacyInventory } = require('../models');
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

// Apply authentication to all patient routes
router.use(authenticateToken);

// @route   GET /api/patients
// @desc    Get paginated patients list, search by name or MRN
// @access  Admin, Doctor, Nurse, Billing
router.get('/', authorize(['admin', 'doctor', 'nurse', 'billing']), async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    let whereCondition = {};
    if (search) {
      whereCondition = {
        [Op.or]: [
          { mrn: { [Op.like]: `%${search}%` } },
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const { count, rows } = await Patient.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      patients: rows
    });
  } catch (error) {
    console.error('Fetch patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Admin, Doctor, Nurse, Billing
router.get('/:id', authorize(['admin', 'doctor', 'nurse', 'billing']), async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Fetch patient by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/patients
// @desc    Create a new patient
// @access  Admin, Doctor, Nurse
router.post('/', [
  authorize(['admin', 'doctor', 'nurse']),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('dob').isDate().withMessage('Please provide a valid date of birth'),
  body('gender').trim().notEmpty().withMessage('Gender is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please provide a valid email'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('blood_group').optional({ checkFalsy: true }).trim()
], validate, async (req, res) => {
  const { 
    first_name, 
    last_name, 
    dob, 
    gender, 
    blood_group, 
    phone, 
    email, 
    address, 
    emergency_contact, 
    insurance_id 
  } = req.body;

  try {
    // Generate a unique MRN (Medical Record Number)
    const randomMRN = `MRN-${Math.floor(100000 + Math.random() * 900000)}`;

    const newPatient = await Patient.create({
      mrn: randomMRN,
      first_name,
      last_name,
      dob,
      gender,
      blood_group,
      phone,
      email,
      address,
      emergency_contact,
      insurance_id
    });

    req.auditRecordId = newPatient.id; // pass to audit logger
    res.status(201).json(newPatient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/patients/:id
// @desc    Update an existing patient
// @access  Admin, Doctor, Nurse
router.put('/:id', [
  authorize(['admin', 'doctor', 'nurse']),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('dob').isDate().withMessage('Please provide a valid date of birth'),
  body('gender').trim().notEmpty().withMessage('Gender is required')
], validate, async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    await patient.update(req.body);
    req.auditRecordId = patient.id; // pass to audit logger
    res.json(patient);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patients/:id/records
// @desc    Get patient medical records history
// @access  Admin, Doctor, Nurse
router.get('/:id/records', authorize(['admin', 'doctor', 'nurse']), async (req, res) => {
  try {
    const records = await MedicalRecord.findAll({
      where: { patient_id: req.params.id },
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] },
        { 
          model: Prescription, 
          as: 'prescriptions',
          include: [{ model: PharmacyInventory, as: 'drug' }]
        }
      ],
      order: [['visit_date', 'DESC']]
    });
    res.json(records);
  } catch (error) {
    console.error('Fetch patient records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patients/:id/billing
// @desc    Get patient billing invoices
// @access  Admin, Billing
router.get('/:id/billing', authorize(['admin', 'billing']), async (req, res) => {
  try {
    const bills = await Billing.findAll({
      where: { patient_id: req.params.id },
      order: [['created_at', 'DESC']]
    });
    res.json(bills);
  } catch (error) {
    console.error('Fetch patient bills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
