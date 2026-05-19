const axios = require('axios');
const logger = require('../utils/logger');

const GROK_API_URL = process.env.GROK_API_URL || 'https://api.x.ai/v1';
const GROK_API_KEY = process.env.GROK_API_KEY;

/**
 * Call Grok API with a prompt
 */
async function callGrok(systemPrompt, userPrompt, options = {}) {
  if (!GROK_API_KEY) {
    throw new Error('GROK_API_KEY is not configured');
  }

  const payload = {
    model: options.model || 'grok-3-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.7,
    stream: false,
  };

  logger.debug(`Calling Grok API: ${payload.model}`);

  try {
    const response = await axios.post(`${GROK_API_URL}/chat/completions`, payload, {
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Grok API');
    return content;
  } catch (err) {
    if (err.response) {
      logger.error(`Grok API error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      throw new Error(`Grok API error: ${err.response.data?.error?.message || err.response.statusText}`);
    }
    throw err;
  }
}

/**
 * Use Grok's live search capability to research a company
 */
async function researchCompany(leadData) {
  const { companyName, website, industry, companySize, role, name } = leadData;

  logger.info(`Researching company: ${companyName}`);

  const systemPrompt = `You are an expert business intelligence analyst with deep knowledge across industries. 
Your goal is to research companies and provide highly detailed, accurate, and actionable insights.
Always respond with valid JSON only. No markdown, no explanation outside JSON.`;

  const userPrompt = `Research the company "${companyName}" thoroughly.
Additional context:
- Website: ${website || 'Not provided'}
- Industry: ${industry || 'Unknown'}
- Company Size: ${companySize || 'Unknown'}
- Contact: ${name} (${role || 'Unknown role'})

Using your knowledge and search capabilities, provide a comprehensive analysis in this EXACT JSON format:
{
  "companyOverview": {
    "fullName": "official company name",
    "description": "2-3 sentence company description",
    "founded": "year or 'Unknown'",
    "headquarters": "city, country",
    "employeeCount": "estimated range",
    "revenue": "estimated annual revenue or range",
    "businessModel": "B2B/B2C/SaaS/etc",
    "website": "official website"
  },
  "industryAnalysis": {
    "primaryIndustry": "main industry",
    "subSector": "specific niche",
    "marketSize": "TAM description",
    "growthRate": "industry growth %",
    "keyTrends": ["trend1", "trend2", "trend3"],
    "regulatoryEnvironment": "brief regulatory context"
  },
  "competitiveLandscape": {
    "mainCompetitors": [
      {"name": "competitor1", "differentiator": "how they differ"},
      {"name": "competitor2", "differentiator": "how they differ"},
      {"name": "competitor3", "differentiator": "how they differ"}
    ],
    "competitiveAdvantage": "what makes this company unique",
    "marketPosition": "leader/challenger/niche player/etc"
  },
  "digitalPresence": {
    "websiteQuality": "assessment of their web presence",
    "socialMediaActivity": "estimated social presence",
    "contentMarketing": "assessment",
    "seoStrength": "estimated SEO standing",
    "techStack": ["known or likely technologies they use"]
  },
  "businessChallenges": [
    {
      "challenge": "specific challenge they likely face",
      "impact": "business impact",
      "urgency": "high/medium/low"
    }
  ],
  "growthOpportunities": [
    {
      "opportunity": "specific growth opportunity",
      "potentialImpact": "description of impact",
      "timeframe": "short/medium/long term"
    }
  ],
  "aiAutomationOpportunities": [
    {
      "area": "specific area where AI/automation could help",
      "currentPainPoint": "what they're likely doing manually",
      "solution": "how SimplifIQ could address this",
      "estimatedROI": "qualitative ROI estimate"
    }
  ],
  "recentNews": [
    {
      "headline": "recent development or likely news",
      "significance": "why it matters",
      "source": "source or 'Industry knowledge'"
    }
  ],
  "keyInsights": {
    "executiveSummary": "3-4 sentence strategic summary",
    "immediateActionItems": ["action1", "action2", "action3"],
    "longtermConsiderations": ["consideration1", "consideration2"]
  },
  "confidenceScore": 85,
  "dataSourceNotes": "Note about data freshness and sources used"
}`;

  try {
    const raw = await callGrok(systemPrompt, userPrompt, { maxTokens: 3000, temperature: 0.3 });

    // Strip markdown code blocks if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error(`Company research failed: ${err.message}`);
    // Return a graceful fallback
    return buildFallbackResearch(leadData);
  }
}

/**
 * Generate personalized recommendations using Grok
 */
async function generatePersonalizedRecommendations(leadData, companyResearch) {
  const systemPrompt = `You are a senior business consultant at SimplifIQ, an AI-powered automation company.
You write highly personalized, strategic recommendations for prospects.
Respond ONLY with valid JSON.`;

  const userPrompt = `Based on this company research, generate hyper-personalized recommendations for ${leadData.companyName}.

Company Research:
${JSON.stringify(companyResearch, null, 2)}

Contact: ${leadData.name} (${leadData.role || 'Decision Maker'})
Their stated challenge/goal: ${leadData.challenges || 'Not specified'}
Budget range: ${leadData.budget || 'Not specified'}

Generate this JSON:
{
  "executiveGreeting": "personalized 2-sentence opening specifically for ${leadData.name} at ${leadData.companyName}",
  "whyNow": "compelling reason why NOW is the right time for them to act (2-3 sentences, specific to their situation)",
  "topRecommendations": [
    {
      "title": "recommendation title",
      "description": "detailed description specific to their business",
      "expectedOutcome": "specific measurable outcome",
      "implementationTime": "timeline",
      "priority": "critical/high/medium"
    }
  ],
  "customAuditFindings": [
    {
      "finding": "specific finding about their business",
      "evidence": "what suggests this is an issue",
      "recommendation": "specific action to take",
      "impact": "business impact if addressed"
    }
  ],
  "proposedNextSteps": [
    {
      "step": "numbered action step",
      "owner": "who should do this",
      "timeline": "when"
    }
  ],
  "personalizedClosing": "2-3 sentence personalized closing that references something specific about their company/industry"
}`;

  try {
    const raw = await callGrok(systemPrompt, userPrompt, { maxTokens: 2000, temperature: 0.6 });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error(`Recommendation generation failed: ${err.message}`);
    return buildFallbackRecommendations(leadData);
  }
}

/**
 * Generate email body using Grok
 */
async function generateOutreachEmail(leadData, companyResearch, recommendations) {
  const systemPrompt = `You are a senior business development representative at SimplifIQ. 
You write compelling, personalized outreach emails that feel human and specific, never generic.
Write in a confident, consultative tone. No fluff, no generic phrases.`;

  const userPrompt = `Write a personalized outreach email to ${leadData.name} at ${leadData.companyName}.

Context:
- Industry: ${companyResearch.industryAnalysis?.primaryIndustry || leadData.industry}
- Key challenge identified: ${companyResearch.businessChallenges?.[0]?.challenge || 'operational efficiency'}
- Top opportunity: ${recommendations.topRecommendations?.[0]?.title || 'AI automation'}
- They are: ${leadData.role || 'a decision maker'}
- Company overview: ${companyResearch.companyOverview?.description || ''}

Write the email with:
1. Subject line that is specific and compelling (not generic)
2. Opening that demonstrates you know their business (not "I came across your company")
3. 2-3 specific insights about their business situation
4. How SimplifIQ addresses their specific challenges
5. Clear, single CTA
6. Professional sign-off

Format:
SUBJECT: [subject line]

[email body]`;

  try {
    return await callGrok(systemPrompt, userPrompt, { maxTokens: 800, temperature: 0.7 });
  } catch (err) {
    logger.error(`Email generation failed: ${err.message}`);
    return buildFallbackEmail(leadData);
  }
}

// ── Fallback builders (when API fails) ──────────────────────────────────────

function buildFallbackResearch(leadData) {
  return {
    companyOverview: {
      fullName: leadData.companyName,
      description: `${leadData.companyName} operates in the ${leadData.industry || 'technology'} sector.`,
      founded: 'Unknown',
      headquarters: 'Unknown',
      employeeCount: leadData.companySize || 'Unknown',
      revenue: 'Undisclosed',
      businessModel: 'B2B',
      website: leadData.website || 'Not provided',
    },
    industryAnalysis: {
      primaryIndustry: leadData.industry || 'Technology',
      subSector: 'Unknown',
      marketSize: 'Significant market opportunity',
      growthRate: 'Growing',
      keyTrends: ['Digital transformation', 'AI adoption', 'Operational efficiency'],
      regulatoryEnvironment: 'Standard industry regulations apply',
    },
    competitiveLandscape: {
      mainCompetitors: [],
      competitiveAdvantage: 'To be determined after deeper analysis',
      marketPosition: 'Established player',
    },
    digitalPresence: {
      websiteQuality: 'Assessment pending',
      socialMediaActivity: 'Active',
      contentMarketing: 'Assessment pending',
      seoStrength: 'Assessment pending',
      techStack: [],
    },
    businessChallenges: [
      { challenge: 'Scaling operations efficiently', impact: 'Growth constraints', urgency: 'high' },
      { challenge: 'Automating manual processes', impact: 'Operational costs', urgency: 'medium' },
    ],
    growthOpportunities: [
      { opportunity: 'Process automation', potentialImpact: 'Significant efficiency gains', timeframe: 'short term' },
      { opportunity: 'Data-driven decision making', potentialImpact: 'Improved outcomes', timeframe: 'medium term' },
    ],
    aiAutomationOpportunities: [
      {
        area: 'Lead processing',
        currentPainPoint: 'Manual lead follow-up',
        solution: 'SimplifIQ automated lead nurturing',
        estimatedROI: '3-5x ROI on sales team time',
      },
    ],
    recentNews: [],
    keyInsights: {
      executiveSummary: `${leadData.companyName} presents a strong opportunity for AI-powered automation to drive growth and efficiency.`,
      immediateActionItems: ['Audit current workflows', 'Identify automation opportunities', 'Pilot AI tools'],
      longtermConsiderations: ['Build AI-first culture', 'Scale automation across teams'],
    },
    confidenceScore: 60,
    dataSourceNotes: 'Based on form submission data. Full enrichment pending API connection.',
  };
}

function buildFallbackRecommendations(leadData) {
  return {
    executiveGreeting: `Dear ${leadData.name}, thank you for reaching out to SimplifIQ.`,
    whyNow: 'The current business environment demands speed and efficiency. AI automation is no longer optional—it is the key differentiator between companies that scale and those that plateau.',
    topRecommendations: [
      {
        title: 'Automated Lead Intelligence Pipeline',
        description: 'Deploy an end-to-end lead enrichment and qualification system.',
        expectedOutcome: '60% reduction in manual research time',
        implementationTime: '2-4 weeks',
        priority: 'critical',
      },
    ],
    customAuditFindings: [],
    proposedNextSteps: [
      { step: 'Schedule a 30-minute discovery call', owner: leadData.name, timeline: 'This week' },
      { step: 'Technical audit of current systems', owner: 'SimplifIQ team', timeline: 'Week 2' },
    ],
    personalizedClosing: `We look forward to discussing how SimplifIQ can accelerate ${leadData.companyName}'s growth journey.`,
  };
}

function buildFallbackEmail(leadData) {
  return `SUBJECT: Personalized AI Audit for ${leadData.companyName}

Dear ${leadData.name},

I've reviewed ${leadData.companyName}'s profile and identified several high-impact opportunities where AI automation could meaningfully accelerate your growth.

Based on your position in the ${leadData.industry || 'market'}, I see strong potential for streamlining operations and improving lead conversion rates through intelligent automation.

I'd love to walk you through a tailored 15-minute demo showing exactly how we'd address your specific challenges.

Are you available for a quick call this week?

Best regards,
The SimplifIQ Team
hello@simplifiq.io`;
}

module.exports = { researchCompany, generatePersonalizedRecommendations, generateOutreachEmail, callGrok };
