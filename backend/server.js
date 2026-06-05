const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
const auditLogger = require('./middleware/audit');

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const recordRoutes = require('./routes/records');
const pharmacyRoutes = require('./routes/pharmacy');
const billingRoutes = require('./routes/billing');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security & Config Middleware
app.use(helmet()); // Sets HTTP headers for security
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite default port
  credentials: true
}));
app.use(express.json()); // JSON parsing

// 2. Logging
app.use(morgan('dev')); // Console request logger

// 3. Rate Limiting (100 requests per 15 mins per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// 4. Register Audit Logging Middleware (runs on successful POST/PUT/DELETE)
app.use(auditLogger);

// 5. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);

// Base health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error' 
  });
});

// 6. DB Connection and Server Boot
const startServer = async () => {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database models (alter: false, will create tables if not present, safe for production)
    await sequelize.sync();
    console.log('Database models synchronized.');

    // Auto-seed database if no users exist (fresh deployment)
    const { User } = require('./models');
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('⚠️ No users found in database. Running auto-seeder...');
      const seed = require('./seeders/demo');
      await seed();
      console.log('✅ Auto-seeding completed successfully.');
    } else {
      console.log(`ℹ️ Database already contains ${userCount} users. Skipping auto-seeding.`);
    }

    app.listen(PORT, () => {
      console.log(`Hospital PMS backend API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database or start server:', error);
    process.exit(1);
  }
};

startServer();
