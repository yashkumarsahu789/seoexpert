import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatAuditForAI } from './auditFormatter.js';

const SYSTEM_PROMPT = `You are an expert SEO developer. Given an SEO audit report, generate exact code patches to fix missing meta tags, headings, and basic SEO issues.

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "patches": [
    {
      "path": "relative/file/path.html",
      "content": "full updated file content OR null if using searchReplace",
      "searchReplace": { "search": "exact string", "replace": "replacement string" }
    }
  ],
  "summary": "Brief description of changes"
}

Rules:
- Prefer searchReplace for small meta tag fixes in existing HTML/JSX files
- Use full content only when creating new files
- Target common files: index.html, public/index.html, src/app/layout.tsx, src/pages/_document.tsx
- Include proper title, meta description, og:title, og:description tags
- Fix H1 issues if detectable from context`;

export async function generateSeoPatches(auditData, apiKey) {
  if (!apiKey) {
    throw new Error('Google AI Studio API key is required');
  }

  const auditText = formatAuditForAI(auditData);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `${SYSTEM_PROMPT}\n\n--- AUDIT REPORT ---\n${auditText}\n\nGenerate patches as JSON:`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON patches');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse AI patch response as JSON');
  }
}
