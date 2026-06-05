const express = require('express');
const { Op } = require('sequelize');
const { Patient, Appointment, Billing, PharmacyInventory } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

// @route   GET /api/dashboard/stats
// @desc    Get counts and metrics for KPIs
// @access  All roles (Admin, Doctor, Nurse, Pharmacist, Billing)
router.get('/stats', async (req, res) => {
  try {
    // 1. Total Patients count
    const totalPatients = await Patient.count();

    // 2. Today's Appointments count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayAppointments = await Appointment.count({
      where: {
        scheduled_at: {
          [Op.between]: [startOfToday, endOfToday]
        }
      }
    });

    // 3. Pending/Partial Bills count
    const pendingBills = await Billing.count({
      where: {
        status: {
          [Op.in]: ['pending', 'partial']
        }
      }
    });

    // 4. Low stock pharmacy count (quantity <= reorder_level)
    const lowStockCount = await PharmacyInventory.count({
      where: {
        quantity: {
          [Op.lte]: sequelize => sequelize.col('reorder_level')
        }
      }
    });

    // 5. Additional data for charting: Appointments count per day for the next 7 days
    const appointmentTrends = [];
    for (let i = -3; i <= 3; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await Appointment.count({
        where: {
          scheduled_at: {
            [Op.between]: [dayStart, dayEnd]
          }
        }
      });

      appointmentTrends.push({
        date: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        appointments: count
      });
    }

    res.json({
      totalPatients,
      todayAppointments,
      pendingBills,
      lowStockCount,
      appointmentTrends
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
