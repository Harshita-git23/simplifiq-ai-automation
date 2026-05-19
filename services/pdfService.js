const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const REPORTS_DIR = path.join(__dirname, '../../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate professional HTML report (converted to PDF)
 */
async function generateReport(leadData, companyResearch, recommendations) {
  logger.info(`Generating PDF report for: ${leadData.companyName}`);

  const reportId = `${Date.now()}-${leadData.companyName.replace(/[^a-z0-9]/gi, '_')}`;
  const htmlPath = path.join(REPORTS_DIR, `${reportId}.html`);
  const pdfPath = path.join(REPORTS_DIR, `${reportId}.pdf`);

  const html = buildReportHTML(leadData, companyResearch, recommendations);

  // Write HTML for inspection/debugging
  fs.writeFileSync(htmlPath, html);

  // Try Puppeteer if available (install separately for PDF rendering)
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
    });
    await browser.close();
    fs.unlinkSync(htmlPath);
    logger.info(`PDF generated via Puppeteer: ${pdfPath}`);
    return { pdfPath, reportId };
  } catch (puppeteerErr) {
    logger.warn(`Puppeteer unavailable (${puppeteerErr.message}) — sending styled HTML report`);
    // Fallback: HTML report is fully styled and professional; sent as attachment
    return { pdfPath: htmlPath, reportId, isHtml: true };
  }
}

function buildReportHTML(leadData, research, recs) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const co = research.companyOverview || {};
  const ind = research.industryAnalysis || {};
  const comp = research.competitiveLandscape || {};
  const dig = research.digitalPresence || {};
  const challenges = research.businessChallenges || [];
  const opportunities = research.growthOpportunities || [];
  const aiOps = research.aiAutomationOpportunities || [];
  const insights = research.keyInsights || {};
  const topRecs = recs.topRecommendations || [];
  const findings = recs.customAuditFindings || [];
  const nextSteps = recs.proposedNextSteps || [];

  const priorityColor = (p) => ({ critical: '#ef4444', high: '#f97316', medium: '#eab308' }[p] || '#6b7280');
  const urgencyColor = (u) => ({ high: '#ef4444', medium: '#f97316', low: '#22c55e' }[u] || '#6b7280');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Business Intelligence Report - ${leadData.companyName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --ink: #0f0f0f;
    --ink-light: #4a4a4a;
    --ink-muted: #888;
    --accent: #1a56db;
    --accent-light: #e8f0fe;
    --gold: #c9a227;
    --gold-light: #fef9e7;
    --danger: #ef4444;
    --success: #22c55e;
    --border: #e5e7eb;
    --bg: #fafafa;
    --white: #ffffff;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    background: var(--white);
    font-size: 10pt;
    line-height: 1.6;
  }

  /* ── COVER PAGE ── */
  .cover {
    width: 100%;
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0f1e 0%, #0d1f4c 50%, #0a0f1e 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }

  .cover::before {
    content: '';
    position: absolute;
    top: -200px; right: -200px;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(26,86,219,0.3) 0%, transparent 70%);
  }

  .cover::after {
    content: '';
    position: absolute;
    bottom: -150px; left: -100px;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(201,162,39,0.2) 0%, transparent 70%);
  }

  .cover-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 1;
  }

  .logo-mark {
    width: 44px; height: 44px;
    background: linear-gradient(135deg, #1a56db, #c9a227);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', serif;
    font-size: 20px;
    color: white;
    font-weight: bold;
  }

  .logo-text {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: white;
    letter-spacing: 0.5px;
  }

  .logo-text span { color: #c9a227; }

  .cover-main { z-index: 1; }

  .cover-tag {
    display: inline-block;
    background: rgba(26,86,219,0.3);
    border: 1px solid rgba(26,86,219,0.5);
    color: #93b4f8;
    font-size: 9pt;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: 20px;
    margin-bottom: 28px;
  }

  .cover-title {
    font-family: 'DM Serif Display', serif;
    font-size: 42px;
    color: white;
    line-height: 1.15;
    margin-bottom: 12px;
  }

  .cover-title em {
    color: #c9a227;
    font-style: italic;
  }

  .cover-subtitle {
    font-size: 15px;
    color: rgba(255,255,255,0.65);
    margin-bottom: 40px;
  }

  .cover-company-card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    padding: 28px 32px;
    backdrop-filter: blur(10px);
    display: inline-flex;
    gap: 48px;
  }

  .cover-company-card .field label {
    font-size: 8pt;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    display: block;
    margin-bottom: 4px;
  }

  .cover-company-card .field strong {
    color: white;
    font-size: 13px;
    font-weight: 600;
  }

  .cover-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    z-index: 1;
    padding-top: 40px;
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  .cover-footer-left p {
    font-size: 8.5pt;
    color: rgba(255,255,255,0.4);
  }

  .cover-footer-right {
    text-align: right;
  }

  .cover-footer-right .report-num {
    font-family: monospace;
    color: #c9a227;
    font-size: 9pt;
  }

  .confidence-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(34,197,94,0.15);
    border: 1px solid rgba(34,197,94,0.3);
    border-radius: 8px;
    padding: 6px 14px;
    margin-top: 8px;
  }

  .confidence-badge .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #22c55e;
  }

  .confidence-badge span {
    color: #86efac;
    font-size: 9pt;
  }

  /* ── CONTENT PAGES ── */
  .page {
    padding: 52px 60px;
    page-break-after: always;
  }

  .page:last-child { page-break-after: auto; }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 20px;
    margin-bottom: 36px;
    border-bottom: 2px solid var(--border);
  }

  .page-header-logo {
    font-family: 'DM Serif Display', serif;
    font-size: 14px;
    color: var(--accent);
  }

  .page-header-logo span { color: var(--gold); }

  .page-header-info {
    text-align: right;
    font-size: 8pt;
    color: var(--ink-muted);
  }

  .section-label {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 6px;
  }

  .section-title {
    font-family: 'DM Serif Display', serif;
    font-size: 26px;
    color: var(--ink);
    margin-bottom: 24px;
    line-height: 1.2;
  }

  /* Executive Summary */
  .exec-summary {
    background: linear-gradient(135deg, #0a0f1e 0%, #1a2a5e 100%);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 28px;
    color: white;
  }

  .exec-summary p {
    font-size: 12pt;
    line-height: 1.7;
    color: rgba(255,255,255,0.88);
  }

  .greeting-box {
    background: var(--accent-light);
    border-left: 4px solid var(--accent);
    padding: 20px 24px;
    border-radius: 0 12px 12px 0;
    margin-bottom: 24px;
  }

  .greeting-box p { font-size: 11pt; color: var(--ink); line-height: 1.7; }

  .why-now-box {
    background: var(--gold-light);
    border: 1px solid #f0d060;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 24px;
  }

  .why-now-box h4 { color: var(--gold); font-size: 9pt; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
  .why-now-box p { font-size: 10.5pt; color: #5a4100; }

  /* Stats Row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }

  .stat-card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px;
    text-align: center;
  }

  .stat-card .stat-value {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: var(--accent);
    display: block;
    margin-bottom: 4px;
  }

  .stat-card .stat-label {
    font-size: 8pt;
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Info Grid */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 28px;
  }

  .info-item {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 18px;
  }

  .info-item label {
    font-size: 7.5pt;
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    display: block;
    margin-bottom: 4px;
  }

  .info-item strong {
    font-size: 10.5pt;
    color: var(--ink);
    font-weight: 600;
  }

  /* Challenges */
  .challenge-card {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 12px;
  }

  .challenge-icon {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: #fee2e2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .challenge-body h4 { font-size: 10.5pt; font-weight: 600; margin-bottom: 4px; }
  .challenge-body p { font-size: 9.5pt; color: var(--ink-light); margin-bottom: 6px; }

  .urgency-tag {
    display: inline-block;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 2px 10px;
    border-radius: 20px;
    background: #fee2e2;
    color: #dc2626;
  }

  /* Recommendation Cards */
  .rec-card {
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
  }

  .rec-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    background: var(--accent);
  }

  .rec-card.priority-critical::before { background: #ef4444; }
  .rec-card.priority-high::before { background: #f97316; }
  .rec-card.priority-medium::before { background: #eab308; }

  .rec-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .rec-title { font-size: 11.5pt; font-weight: 700; color: var(--ink); }

  .priority-badge {
    font-size: 7.5pt; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px;
    padding: 3px 10px; border-radius: 20px;
    background: var(--accent-light); color: var(--accent);
    flex-shrink: 0;
  }

  .rec-desc { font-size: 9.5pt; color: var(--ink-light); margin-bottom: 12px; line-height: 1.6; }

  .rec-meta { display: flex; gap: 20px; }
  .rec-meta span { font-size: 8.5pt; color: var(--ink-muted); }
  .rec-meta strong { color: var(--ink); }

  /* AI Opportunities */
  .ai-opp-card {
    background: linear-gradient(135deg, #f0f4ff 0%, #f8f9ff 100%);
    border: 1px solid #c7d7fb;
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 12px;
  }

  .ai-opp-card h4 { font-size: 10.5pt; font-weight: 700; color: var(--accent); margin-bottom: 8px; }
  .ai-opp-card .opp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ai-opp-card .opp-item label { font-size: 7.5pt; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 3px; }
  .ai-opp-card .opp-item p { font-size: 9pt; color: var(--ink-light); }

  /* Competitors */
  .competitor-row {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 0; border-bottom: 1px solid var(--border);
  }

  .competitor-row:last-child { border-bottom: none; }

  .comp-name { font-weight: 600; font-size: 10pt; width: 160px; flex-shrink: 0; }
  .comp-diff { font-size: 9pt; color: var(--ink-light); flex: 1; }

  /* Next Steps */
  .next-step {
    display: flex; gap: 16px; align-items: flex-start;
    padding: 14px 0; border-bottom: 1px solid var(--border);
  }

  .step-num {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--accent); color: white;
    font-size: 10pt; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .step-body h4 { font-size: 10.5pt; font-weight: 600; margin-bottom: 3px; }
  .step-body p { font-size: 8.5pt; color: var(--ink-muted); }

  /* Trends */
  .trend-pill {
    display: inline-block;
    background: var(--accent-light);
    color: var(--accent);
    border: 1px solid #c7d7fb;
    font-size: 8.5pt;
    padding: 4px 12px;
    border-radius: 20px;
    margin: 3px;
    font-weight: 500;
  }

  /* Footer */
  .page-footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .page-footer p { font-size: 7.5pt; color: var(--ink-muted); }

  .closing-box {
    background: linear-gradient(135deg, #0a0f1e 0%, #1a2a5e 100%);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    margin-top: 24px;
  }

  .closing-box p { color: rgba(255,255,255,0.85); font-size: 11pt; line-height: 1.7; margin-bottom: 20px; }

  .cta-button {
    display: inline-block;
    background: #c9a227;
    color: #0a0f1e;
    font-weight: 700;
    font-size: 11pt;
    padding: 12px 32px;
    border-radius: 8px;
    text-decoration: none;
    letter-spacing: 0.5px;
  }

  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
    margin: 28px 0;
  }

  /* Findings */
  .finding-card {
    background: #fff8f0;
    border: 1px solid #fed7aa;
    border-left: 4px solid #f97316;
    border-radius: 0 12px 12px 0;
    padding: 16px 20px;
    margin-bottom: 12px;
  }

  .finding-card h4 { font-size: 10.5pt; font-weight: 700; color: #c2410c; margin-bottom: 6px; }
  .finding-card p { font-size: 9.5pt; color: #7c2d12; margin-bottom: 4px; }
  .finding-card .finding-rec { font-size: 9pt; color: #1d4ed8; font-style: italic; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 40px 50px; }
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-logo">
    <div class="logo-mark">S</div>
    <div class="logo-text">Simplif<span>IQ</span></div>
  </div>

  <div class="cover-main">
    <div class="cover-tag">Confidential Intelligence Report</div>
    <div class="cover-title">
      Business Intelligence<br>
      &amp; <em>AI Opportunity</em><br>
      Audit Report
    </div>
    <div class="cover-subtitle">Prepared exclusively for ${escHtml(leadData.companyName)}</div>

    <div class="cover-company-card">
      <div class="field">
        <label>Company</label>
        <strong>${escHtml(co.fullName || leadData.companyName)}</strong>
      </div>
      <div class="field">
        <label>Industry</label>
        <strong>${escHtml(ind.primaryIndustry || leadData.industry || 'Technology')}</strong>
      </div>
      <div class="field">
        <label>Prepared For</label>
        <strong>${escHtml(leadData.name)}</strong>
      </div>
      <div class="field">
        <label>Date</label>
        <strong>${dateStr}</strong>
      </div>
    </div>

    <div style="margin-top: 20px;">
      <div class="confidence-badge">
        <div class="dot"></div>
        <span>Analysis Confidence: ${research.confidenceScore || 85}% &nbsp;·&nbsp; AI-Powered Intelligence</span>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-footer-left">
      <p>SimplifIQ Intelligence Platform</p>
      <p>hello@simplifiq.io &nbsp;·&nbsp; www.simplifiq.io</p>
    </div>
    <div class="cover-footer-right">
      <div class="report-num">REP-${Date.now().toString(36).toUpperCase()}</div>
      <p style="color: rgba(255,255,255,0.3); font-size: 8pt; margin-top: 4px;">Confidential — Not for distribution</p>
    </div>
  </div>
</div>

<!-- PAGE 1: Executive Summary -->
<div class="page">
  <div class="page-header">
    <div class="page-header-logo">Simplif<span>IQ</span></div>
    <div class="page-header-info">
      <div>${escHtml(leadData.companyName)} Intelligence Report</div>
      <div>${dateStr}</div>
    </div>
  </div>

  <div class="section-label">Section 01</div>
  <div class="section-title">Executive Summary</div>

  ${recs.executiveGreeting ? `
  <div class="greeting-box">
    <p>${escHtml(recs.executiveGreeting)}</p>
  </div>
  ` : ''}

  <div class="exec-summary">
    <p>${escHtml(insights.executiveSummary || `${leadData.companyName} operates in a rapidly evolving market with significant opportunities for AI-driven optimization.`)}</p>
  </div>

  ${recs.whyNow ? `
  <div class="why-now-box">
    <h4>⚡ Why Act Now</h4>
    <p>${escHtml(recs.whyNow)}</p>
  </div>
  ` : ''}

  <div class="stats-row">
    <div class="stat-card">
      <span class="stat-value">${challenges.length || '3'}+</span>
      <div class="stat-label">Challenges Identified</div>
    </div>
    <div class="stat-card">
      <span class="stat-value">${aiOps.length || '3'}+</span>
      <div class="stat-label">AI Opportunities</div>
    </div>
    <div class="stat-card">
      <span class="stat-value">${topRecs.length || '3'}</span>
      <div class="stat-label">Recommendations</div>
    </div>
    <div class="stat-card">
      <span class="stat-value">${research.confidenceScore || 85}%</span>
      <div class="stat-label">Data Confidence</div>
    </div>
  </div>

  ${insights.immediateActionItems && insights.immediateActionItems.length > 0 ? `
  <h3 style="font-size: 11.5pt; margin-bottom: 12px; color: var(--ink);">Immediate Action Items</h3>
  ${insights.immediateActionItems.map((a, i) => `
    <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px;">
      <div style="width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: white; font-size: 8pt; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${i + 1}</div>
      <p style="font-size: 9.5pt; color: var(--ink-light); padding-top: 2px;">${escHtml(a)}</p>
    </div>
  `).join('')}
  ` : ''}

  <div class="page-footer">
    <p>SimplifIQ Confidential Intelligence Report · ${escHtml(leadData.companyName)}</p>
    <p>Page 2 of 5</p>
  </div>
</div>

<!-- PAGE 2: Company Profile -->
<div class="page">
  <div class="page-header">
    <div class="page-header-logo">Simplif<span>IQ</span></div>
    <div class="page-header-info">
      <div>${escHtml(leadData.companyName)} Intelligence Report</div>
      <div>${dateStr}</div>
    </div>
  </div>

  <div class="section-label">Section 02</div>
  <div class="section-title">Company &amp; Industry Profile</div>

  ${co.description ? `<p style="font-size: 11pt; color: var(--ink-light); line-height: 1.7; margin-bottom: 24px; padding: 16px; background: var(--bg); border-radius: 10px;">${escHtml(co.description)}</p>` : ''}

  <div class="info-grid">
    ${[
      ['Founded', co.founded],
      ['Headquarters', co.headquarters],
      ['Employees', co.employeeCount || leadData.companySize],
      ['Revenue', co.revenue],
      ['Business Model', co.businessModel],
      ['Market Position', comp.marketPosition],
    ].filter(([, v]) => v && v !== 'Unknown').map(([l, v]) => `
      <div class="info-item">
        <label>${escHtml(l)}</label>
        <strong>${escHtml(v)}</strong>
      </div>
    `).join('')}
  </div>

  <div class="divider"></div>

  <h3 style="font-size: 13pt; font-family: 'DM Serif Display', serif; margin-bottom: 16px;">Industry Analysis</h3>

  <div class="info-grid">
    ${[
      ['Primary Sector', ind.primaryIndustry],
      ['Sub-Sector', ind.subSector],
      ['Market Size', ind.marketSize],
      ['Growth Rate', ind.growthRate],
      ['Regulatory Environment', ind.regulatoryEnvironment],
    ].filter(([, v]) => v && v !== 'Unknown').map(([l, v]) => `
      <div class="info-item">
        <label>${escHtml(l)}</label>
        <strong>${escHtml(v)}</strong>
      </div>
    `).join('')}
  </div>

  ${ind.keyTrends && ind.keyTrends.length > 0 ? `
  <div style="margin-top: 20px;">
    <h4 style="font-size: 9pt; font-weight: 700; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">Key Industry Trends</h4>
    <div>${ind.keyTrends.map(t => `<span class="trend-pill">${escHtml(t)}</span>`).join('')}</div>
  </div>
  ` : ''}

  ${comp.mainCompetitors && comp.mainCompetitors.length > 0 ? `
  <div style="margin-top: 24px;">
    <h4 style="font-size: 9pt; font-weight: 700; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Competitive Landscape</h4>
    ${comp.mainCompetitors.map(c => `
      <div class="competitor-row">
        <div class="comp-name">${escHtml(c.name || '')}</div>
        <div class="comp-diff">${escHtml(c.differentiator || '')}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="page-footer">
    <p>SimplifIQ Confidential Intelligence Report · ${escHtml(leadData.companyName)}</p>
    <p>Page 3 of 5</p>
  </div>
</div>

<!-- PAGE 3: Challenges & AI Opportunities -->
<div class="page">
  <div class="page-header">
    <div class="page-header-logo">Simplif<span>IQ</span></div>
    <div class="page-header-info">
      <div>${escHtml(leadData.companyName)} Intelligence Report</div>
      <div>${dateStr}</div>
    </div>
  </div>

  <div class="section-label">Section 03</div>
  <div class="section-title">Business Challenges &amp; AI Opportunities</div>

  ${challenges.length > 0 ? `
  <h3 style="font-size: 11.5pt; margin-bottom: 14px; color: var(--ink);">Identified Business Challenges</h3>
  ${challenges.map(ch => `
    <div class="challenge-card">
      <div class="challenge-icon">⚠️</div>
      <div class="challenge-body">
        <h4>${escHtml(ch.challenge || '')}</h4>
        <p>${escHtml(ch.impact || '')}</p>
        <span class="urgency-tag" style="background: ${urgencyColor(ch.urgency)}22; color: ${urgencyColor(ch.urgency)};">${escHtml(ch.urgency || 'medium')} urgency</span>
      </div>
    </div>
  `).join('')}
  <div class="divider"></div>
  ` : ''}

  ${aiOps.length > 0 ? `
  <h3 style="font-size: 11.5pt; margin-bottom: 14px; color: var(--ink);">AI &amp; Automation Opportunities</h3>
  ${aiOps.map(op => `
    <div class="ai-opp-card">
      <h4>🤖 ${escHtml(op.area || '')}</h4>
      <div class="opp-grid">
        <div class="opp-item">
          <label>Current Pain Point</label>
          <p>${escHtml(op.currentPainPoint || '')}</p>
        </div>
        <div class="opp-item">
          <label>SimplifIQ Solution</label>
          <p>${escHtml(op.solution || '')}</p>
        </div>
        <div class="opp-item">
          <label>Estimated ROI</label>
          <p>${escHtml(op.estimatedROI || '')}</p>
        </div>
      </div>
    </div>
  `).join('')}
  ` : ''}

  <div class="page-footer">
    <p>SimplifIQ Confidential Intelligence Report · ${escHtml(leadData.companyName)}</p>
    <p>Page 4 of 5</p>
  </div>
</div>

<!-- PAGE 4: Recommendations & Next Steps -->
<div class="page">
  <div class="page-header">
    <div class="page-header-logo">Simplif<span>IQ</span></div>
    <div class="page-header-info">
      <div>${escHtml(leadData.companyName)} Intelligence Report</div>
      <div>${dateStr}</div>
    </div>
  </div>

  <div class="section-label">Section 04</div>
  <div class="section-title">Strategic Recommendations</div>

  ${topRecs.length > 0 ? topRecs.map(rec => `
    <div class="rec-card priority-${rec.priority || 'medium'}">
      <div class="rec-header">
        <div class="rec-title">${escHtml(rec.title || '')}</div>
        <div class="priority-badge" style="background: ${priorityColor(rec.priority)}22; color: ${priorityColor(rec.priority)};">${escHtml(rec.priority || 'medium')}</div>
      </div>
      <div class="rec-desc">${escHtml(rec.description || '')}</div>
      <div class="rec-meta">
        <span><strong>Outcome:</strong> ${escHtml(rec.expectedOutcome || '')}</span>
        <span><strong>Timeline:</strong> ${escHtml(rec.implementationTime || '')}</span>
      </div>
    </div>
  `).join('') : ''}

  ${findings.length > 0 ? `
  <div class="divider"></div>
  <h3 style="font-size: 11.5pt; margin-bottom: 14px;">Custom Audit Findings</h3>
  ${findings.map(f => `
    <div class="finding-card">
      <h4>🔍 ${escHtml(f.finding || '')}</h4>
      <p>${escHtml(f.evidence || '')}</p>
      <p class="finding-rec">→ ${escHtml(f.recommendation || '')}</p>
    </div>
  `).join('')}
  ` : ''}

  ${nextSteps.length > 0 ? `
  <div class="divider"></div>
  <h3 style="font-size: 11.5pt; margin-bottom: 14px;">Proposed Next Steps</h3>
  ${nextSteps.map((step, i) => `
    <div class="next-step">
      <div class="step-num">${i + 1}</div>
      <div class="step-body">
        <h4>${escHtml(step.step || '')}</h4>
        <p>${escHtml(step.owner || '')} &nbsp;·&nbsp; ${escHtml(step.timeline || '')}</p>
      </div>
    </div>
  `).join('')}
  ` : ''}

  <div class="closing-box" style="margin-top: 32px;">
    <p>${escHtml(recs.personalizedClosing || `We look forward to partnering with ${leadData.companyName} to unlock its full potential through intelligent automation.`)}</p>
    <a href="mailto:hello@simplifiq.io" class="cta-button">Schedule Your Strategy Call →</a>
  </div>

  <div class="page-footer">
    <p>SimplifIQ Confidential Intelligence Report · ${escHtml(leadData.companyName)}</p>
    <p>Page 5 of 5</p>
  </div>
</div>

</body>
</html>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { generateReport };
