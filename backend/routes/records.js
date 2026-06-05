const express = require('express');
const { body, validationResult } = require('express-validator');
const { sequelize, MedicalRecord, Patient, User, Prescription, PharmacyInventory } = require('../models');
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

// Apply authentication to all medical records routes
router.use(authenticateToken);

// @route   GET /api/records/:id
// @desc    Get medical record detail by ID
// @access  Admin, Doctor, Nurse
router.get('/:id', authorize(['admin', 'doctor', 'nurse']), async (req, res) => {
  try {
    const record = await MedicalRecord.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name', 'dob', 'gender'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] },
        { 
          model: Prescription, 
          as: 'prescriptions',
          include: [{ model: PharmacyInventory, as: 'drug', attributes: ['id', 'drug_name', 'generic_name', 'price', 'unit'] }]
        }
      ]
    });

    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    res.json(record);
  } catch (error) {
    console.error('Fetch medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/records
// @desc    Create a new medical record (with optional prescriptions)
// @access  Admin, Doctor
router.post('/', [
  authorize(['admin', 'doctor']),
  body('patient_id').isInt().withMessage('Valid patient ID is required'),
  body('doctor_id').isInt().withMessage('Valid doctor ID is required'),
  body('visit_date').isDate().withMessage('Valid visit date is required'),
  body('diagnosis').trim().notEmpty().withMessage('Diagnosis is required'),
  body('icd10_code').trim().notEmpty().withMessage('ICD-10 code is required'),
  body('notes').optional().trim(),
  body('prescription').optional().trim(), // plain text summary
  body('prescriptionsList').optional().isArray().withMessage('Prescriptions list must be an array')
], validate, async (req, res) => {
  const { 
    patient_id, 
    doctor_id, 
    visit_date, 
    diagnosis, 
    icd10_code, 
    notes, 
    prescription, 
    prescriptionsList 
  } = req.body;

  // Transaction to ensure record and prescription database entries are atomic
  const transaction = await sequelize.transaction();

  try {
    // Check if patient exists
    const patientExists = await Patient.findByPk(patient_id, { transaction });
    if (!patientExists) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Patient does not exist' });
    }

    // Check if doctor exists
    const doctorExists = await User.findOne({ where: { id: doctor_id, role: 'doctor' }, transaction });
    if (!doctorExists) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Doctor does not exist' });
    }

    // Create the Medical Record
    const newRecord = await MedicalRecord.create({
      patient_id,
      doctor_id,
      visit_date,
      diagnosis,
      icd10_code,
      notes,
      prescription
    }, { transaction });

    // Handle any linked prescription line-items
    if (prescriptionsList && prescriptionsList.length > 0) {
      for (const rx of prescriptionsList) {
        // Validate each rx object has required properties
        if (!rx.drug_id || !rx.dosage || !rx.frequency || !rx.duration_days) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Each prescription must contain drug_id, dosage, frequency, and duration_days' });
        }

        // Validate drug exists in inventory
        const drugExists = await PharmacyInventory.findByPk(rx.drug_id, { transaction });
        if (!drugExists) {
          await transaction.rollback();
          return res.status(400).json({ message: `Drug with ID ${rx.drug_id} does not exist in pharmacy inventory` });
        }

        await Prescription.create({
          record_id: newRecord.id,
          drug_id: rx.drug_id,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration_days: parseInt(rx.duration_days, 10),
          dispensed: false
        }, { transaction });
      }
    }

    await transaction.commit();

    // Fetch complete record with all joins to return to client
    const fullRecord = await MedicalRecord.findByPk(newRecord.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name'] },
        { model: User, as: 'doctor', attributes: ['id', 'name'] },
        { 
          model: Prescription, 
          as: 'prescriptions',
          include: [{ model: PharmacyInventory, as: 'drug', attributes: ['id', 'drug_name', 'generic_name'] }]
        }
      ]
    });

    req.auditRecordId = newRecord.id; // pass to audit logger
    res.status(201).json(fullRecord);
  } catch (error) {
    await transaction.rollback();
    console.error('Create medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/records/:id
// @desc    Update medical record diagnosis or notes
// @access  Admin, Doctor
router.put('/:id', [
  authorize(['admin', 'doctor']),
  body('diagnosis').optional().trim().notEmpty().withMessage('Diagnosis cannot be empty'),
  body('icd10_code').optional().trim().notEmpty().withMessage('ICD-10 code cannot be empty'),
  body('notes').optional().trim(),
  body('prescription').optional().trim()
], validate, async (req, res) => {
  try {
    const record = await MedicalRecord.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    await record.update(req.body);

    const fullRecord = await MedicalRecord.findByPk(record.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name'] },
        { model: User, as: 'doctor', attributes: ['id', 'name'] },
        { 
          model: Prescription, 
          as: 'prescriptions',
          include: [{ model: PharmacyInventory, as: 'drug', attributes: ['id', 'drug_name', 'generic_name'] }]
        }
      ]
    });

    req.auditRecordId = record.id; // pass to audit logger
    res.json(fullRecord);
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
