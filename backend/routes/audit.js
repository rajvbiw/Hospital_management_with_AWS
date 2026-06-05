const express = require('express');
const { AuditLog, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// Apply authentication to all audit log routes
router.use(authenticateToken);

// @route   GET /api/audit-logs
// @desc    Get paginated audit logs for administration auditing
// @access  Admin only
router.get('/', authorize('admin'), async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  try {
    const { count, rows } = await AuditLog.findAndCountAll({
      limit,
      offset,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      logs: rows
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
