const express = require('express');
const { body, validationResult } = require('express-validator');
const { sequelize, PharmacyInventory, Prescription, MedicalRecord, Patient, User } = require('../models');
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

// Apply authentication to all pharmacy routes
router.use(authenticateToken);

// @route   GET /api/pharmacy/inventory
// @desc    Get pharmacy drug inventory (supports search and alerts low stock)
// @access  Admin, Pharmacist, Doctor, Nurse
router.get('/inventory', authorize(['admin', 'pharmacist', 'doctor', 'nurse']), async (req, res) => {
  try {
    const inventory = await PharmacyInventory.findAll({
      order: [['drug_name', 'ASC']]
    });
    res.json(inventory);
  } catch (error) {
    console.error('Fetch inventory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/pharmacy/inventory
// @desc    Add a new drug item to inventory
// @access  Admin, Pharmacist
router.post('/inventory', [
  authorize(['admin', 'pharmacist']),
  body('drug_name').trim().notEmpty().withMessage('Drug name is required'),
  body('generic_name').trim().notEmpty().withMessage('Generic name is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or greater'),
  body('unit').trim().notEmpty().withMessage('Unit (e.g. Tablets, Inhalers) is required'),
  body('reorder_level').isInt({ min: 1 }).withMessage('Reorder level must be 1 or greater'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be 0 or greater'),
  body('expiry_date').isDate().withMessage('Valid expiry date is required')
], validate, async (req, res) => {
  try {
    const newDrug = await PharmacyInventory.create(req.body);
    req.auditRecordId = newDrug.id; // pass to audit logger
    res.status(201).json(newDrug);
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/pharmacy/inventory/:id
// @desc    Update drug details or restock quantity
// @access  Admin, Pharmacist
router.put('/inventory/:id', [
  authorize(['admin', 'pharmacist']),
  body('drug_name').optional().trim().notEmpty().withMessage('Drug name cannot be empty'),
  body('generic_name').optional().trim().notEmpty().withMessage('Generic name cannot be empty'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be 0 or greater'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be 0 or greater')
], validate, async (req, res) => {
  try {
    const drug = await PharmacyInventory.findByPk(req.params.id);
    if (!drug) {
      return res.status(404).json({ message: 'Drug not found' });
    }

    await drug.update(req.body);
    req.auditRecordId = drug.id; // pass to audit logger
    res.json(drug);
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pharmacy/prescriptions/pending
// @desc    Get list of pending (undispensed) prescriptions
// @access  Admin, Pharmacist
router.get('/prescriptions/pending', authorize(['admin', 'pharmacist']), async (req, res) => {
  try {
    const pending = await Prescription.findAll({
      where: { dispensed: false },
      include: [
        { model: PharmacyInventory, as: 'drug' },
        { 
          model: MedicalRecord, 
          as: 'medicalRecord',
          include: [
            { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name'] },
            { model: User, as: 'doctor', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(pending);
  } catch (error) {
    console.error('Fetch pending prescriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/pharmacy/prescriptions/:id/dispense
// @desc    Dispense prescription, decrementing inventory stock
// @access  Admin, Pharmacist
router.put('/prescriptions/:id/dispense', authorize(['admin', 'pharmacist']), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // 1. Fetch prescription details
    const prescription = await Prescription.findByPk(req.params.id, {
      include: [{ model: PharmacyInventory, as: 'drug' }],
      transaction
    });

    if (!prescription) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (prescription.dispensed) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Prescription is already dispensed' });
    }

    // 2. Fetch the corresponding drug inventory item
    const drug = await PharmacyInventory.findByPk(prescription.drug_id, { transaction });
    if (!drug) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Drug inventory item not found' });
    }

    // 3. Verify stock
    // Assume quantity to dispense is duration_days (e.g. 1 pill per day, or custom quantity logic)
    const quantityToDispense = prescription.duration_days;
    if (drug.quantity < quantityToDispense) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: `Insufficient inventory. Required: ${quantityToDispense}, Available: ${drug.quantity}` 
      });
    }

    // 4. Update drug stock and prescription status
    await drug.update({
      quantity: drug.quantity - quantityToDispense
    }, { transaction });

    await prescription.update({
      dispensed: true
    }, { transaction });

    await transaction.commit();

    // Fetch the updated item with relation to return
    const updatedPrescription = await Prescription.findByPk(prescription.id, {
      include: [{ model: PharmacyInventory, as: 'drug' }]
    });

    req.auditRecordId = prescription.id; // pass to audit logger
    res.json({
      message: 'Prescription dispensed successfully',
      prescription: updatedPrescription
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Dispense prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
