const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');

const { enrichLead } = require('../services/enrichmentService');
const { researchCompany, generatePersonalizedRecommendations, generateOutreachEmail } = require('../services/grokService');
const { generateReport } = require('../services/pdfService');
const { sendOutreachEmail } = require('../services/emailService');
// Validation middleware
const validateLead = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('website').optional().trim(),
  body('industry').optional().trim(),
  body('companySize').optional().trim(),
  body('role').optional().trim(),
  body('challenges').optional().trim(),
  body('budget').optional().trim(),
];

/**
 * POST /api/leads
 * Main lead intake + full automation pipeline
 */
router.post('/', validateLead, async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const leadData = {
    name: req.body.name,
    email: req.body.email,
    companyName: req.body.companyName,
    website: req.body.website || '',
    industry: req.body.industry || '',
    companySize: req.body.companySize || '',
    role: req.body.role || '',
    challenges: req.body.challenges || '',
    budget: req.body.budget || '',
    submittedAt: new Date().toISOString(),
  };

  logger.info(`New lead received: ${leadData.name} <${leadData.email}> @ ${leadData.companyName}`);

  // Immediately acknowledge — pipeline runs async
  res.status(202).json({
    success: true,
    message: 'Lead received! We\'re generating your personalized report. Check your email shortly.',
    leadId: `lead_${Date.now()}`,
  });

  // ── Run full pipeline asynchronously ────────────────────────────────────
  runPipeline(leadData);
});

async function runPipeline(leadData) {
  const startTime = Date.now();
  const stages = { enrichment: null, research: null, recommendations: null, email: null, pdf: null };
  try {
    // Stage 1: Web enrichment (parallel-safe)
    logger.info(`[Pipeline] Stage 1: Enriching lead data...`);
    const enrichment = await enrichLead(leadData).catch(err => {
      logger.warn(`Enrichment warning: ${err.message}`);
      return {};
    });
    stages.enrichment = 'done';

    // Merge enrichment context into leadData
    const enrichedLead = { ...leadData, enrichment };

    // Stage 2: Grok AI research
    logger.info(`[Pipeline] Stage 2: AI company research...`);
    const companyResearch = await researchCompany(enrichedLead);
    stages.research = 'done';

    // Stage 3: Personalized recommendations
    logger.info(`[Pipeline] Stage 3: Generating recommendations...`);
    const recommendations = await generatePersonalizedRecommendations(enrichedLead, companyResearch);
    stages.recommendations = 'done';

    // Stage 4: Generate outreach email content
    logger.info(`[Pipeline] Stage 4: Generating email content...`);
    const emailContent = await generateOutreachEmail(enrichedLead, companyResearch, recommendations);
    stages.email = 'done';

    // Stage 5: Generate PDF report
    logger.info(`[Pipeline] Stage 5: Generating PDF report...`);
    const { pdfPath, reportId, isHtml } = await generateReport(enrichedLead, companyResearch, recommendations);
    stages.pdf = 'done';
    logger.info(`Report generated: ${pdfPath}`);

    // Stage 6: Send email with report
    logger.info(`[Pipeline] Stage 6: Sending outreach email...`);
    await sendOutreachEmail(enrichedLead, emailContent, pdfPath);
    stages.email = 'sent';

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[Pipeline] ✅ Complete for ${leadData.companyName} in ${elapsed}s | Stages: ${JSON.stringify(stages)}`);

  } catch (err) {
    logger.error(`[Pipeline] ❌ Failed for ${leadData.email}: ${err.message}`, err);

    // Best-effort: log to sheet even on failure
  }
}

/**
 * GET /api/leads/health
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
