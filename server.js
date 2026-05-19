require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Ensure required directories ───────────────────────────────────────────
['logs', 'reports'].forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/leads', require('./routes/leads'));

// Serve static frontend (when deployed together)
const frontendBuild = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SimplifIQ Lead Automation',
    timestamp: new Date().toISOString(),
    config: {
      grok: !!process.env.GROK_API_KEY,
      smtp: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    },
  });
});

// ── 404 & Error Handlers ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start server ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`SimplifIQ backend running on port ${PORT}`);
  logger.info(`Config status:`);
  logger.info(`   Grok API: ${process.env.GROK_API_KEY ? ' configured' : 'missing'}`);
  logger.info(`   SMTP: ${process.env.SMTP_USER ? ' configured' : ' missing'}`);
});

module.exports = app;
