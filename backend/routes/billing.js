const express = require('express');
const { body, validationResult } = require('express-validator');
const { sequelize, Billing, Patient, Appointment } = require('../models');
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

// Apply authentication to all billing routes
router.use(authenticateToken);

// @route   GET /api/billing
// @desc    Get billing invoices, filter by status
// @access  Admin, Billing
router.get('/', authorize(['admin', 'billing']), async (req, res) => {
  const { status } = req.query;
  const whereCondition = {};

  try {
    if (status) {
      whereCondition.status = status;
    }

    const bills = await Billing.findAll({
      where: whereCondition,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name', 'phone'] },
        { model: Appointment, as: 'appointment', attributes: ['id', 'scheduled_at'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(bills);
  } catch (error) {
    console.error('Fetch billing invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/billing
// @desc    Create a new invoice/bill
// @access  Admin, Billing
router.post('/', [
  authorize(['admin', 'billing']),
  body('patient_id').isInt().withMessage('Valid patient ID is required'),
  body('appointment_id').optional({ nullable: true }).isInt().withMessage('Valid appointment ID must be an integer'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Total amount must be greater than or equal to 0'),
  body('paid_amount').optional().isFloat({ min: 0 }).withMessage('Paid amount must be greater than or equal to 0'),
  body('status').optional().isIn(['pending', 'partial', 'paid']).withMessage('Invalid billing status'),
  body('payment_method').optional().trim()
], validate, async (req, res) => {
  const { patient_id, appointment_id, total_amount, paid_amount, status, payment_method } = req.body;

  try {
    // Check if patient exists
    const patientExists = await Patient.findByPk(patient_id);
    if (!patientExists) {
      return res.status(400).json({ message: 'Patient does not exist' });
    }

    // Check if appointment exists if provided
    if (appointment_id) {
      const apptExists = await Appointment.findByPk(appointment_id);
      if (!apptExists) {
        return res.status(400).json({ message: 'Appointment does not exist' });
      }
    }

    const finalPaid = paid_amount || 0;
    let finalStatus = status || 'pending';
    if (!status) {
      if (finalPaid >= total_amount) {
        finalStatus = 'paid';
      } else if (finalPaid > 0) {
        finalStatus = 'partial';
      }
    }

    const bill = await Billing.create({
      patient_id,
      appointment_id: appointment_id || null,
      total_amount,
      paid_amount: finalPaid,
      status: finalStatus,
      payment_method: finalPaid > 0 ? (payment_method || 'Cash') : null
    });

    const fullBill = await Billing.findByPk(bill.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name'] }
      ]
    });

    req.auditRecordId = bill.id; // pass to audit logger
    res.status(201).json(fullBill);
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/billing/:id/payment
// @desc    Record a payment towards an invoice
// @access  Admin, Billing
router.put('/:id/payment', [
  authorize(['admin', 'billing']),
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
  body('payment_method').trim().notEmpty().withMessage('Payment method is required')
], validate, async (req, res) => {
  const { amount, payment_method } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const bill = await Billing.findByPk(req.params.id, { transaction });
    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const total = parseFloat(bill.total_amount);
    const alreadyPaid = parseFloat(bill.paid_amount);
    const newPaid = alreadyPaid + parseFloat(amount);

    let status = 'partial';
    if (newPaid >= total) {
      status = 'paid';
    }

    await bill.update({
      paid_amount: newPaid,
      status,
      payment_method
    }, { transaction });

    await transaction.commit();

    const updatedBill = await Billing.findByPk(bill.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'mrn', 'first_name', 'last_name'] }
      ]
    });

    req.auditRecordId = bill.id; // pass to audit logger
    res.json({
      message: 'Payment recorded successfully',
      bill: updatedBill
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
