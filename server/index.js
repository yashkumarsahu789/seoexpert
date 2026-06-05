import express from 'express';
import cors from 'cors';
import { auditWebsite } from './services/auditService.js';
import { generateSeoPatches } from './services/aiService.js';
import { pushSeoPatches } from './services/githubService.js';
import { formatAuditForAI } from './services/auditFormatter.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'seoexpert-api' });
});

app.post('/api/audit', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await auditWebsite(url);
    return res.json(result);
  } catch (err) {
    const message = err.message || 'Audit failed';
    const status = message.includes('timed out') || message.includes('blocking') ? 504 : 500;
    return res.status(status).json({
      error: message,
      success: false,
    });
  }
});

app.post('/api/generate-patch', async (req, res) => {
  try {
    const { auditData, apiKey } = req.body;
    if (!auditData) {
      return res.status(400).json({ error: 'auditData is required' });
    }

    const patches = await generateSeoPatches(auditData, apiKey);
    return res.json(patches);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Patch generation failed' });
  }
});

app.post('/api/patch-code', async (req, res) => {
  try {
    const { token, repo, branch, patches } = req.body;
    const result = await pushSeoPatches({ token, repo, branch, patches });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'GitHub push failed' });
  }
});

app.post('/api/orchestrate', async (req, res) => {
  try {
    const { auditData, apiKey, token, repo, branch = 'main' } = req.body;

    if (!auditData) return res.status(400).json({ error: 'auditData is required' });
    if (!apiKey) return res.status(400).json({ error: 'Google AI API key is required' });
    if (!token) return res.status(400).json({ error: 'GitHub PAT is required' });
    if (!repo) return res.status(400).json({ error: 'Repository is required' });

    const auditSummary = formatAuditForAI(auditData);
    const patchResult = await generateSeoPatches(auditData, apiKey);

    if (!patchResult.patches?.length) {
      return res.status(422).json({
        error: 'AI did not generate any patches',
        auditSummary,
        patchResult,
      });
    }

    const deployResult = await pushSeoPatches({
      token,
      repo,
      branch,
      patches: patchResult.patches,
    });

    return res.json({
      success: true,
      auditSummary,
      patchResult,
      deployResult,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Orchestration failed' });
  }
});

app.listen(PORT, () => {
  console.log(`SEO Expert API running on http://localhost:${PORT}`);
});

export default app;
