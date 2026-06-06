import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Cpu,
  Globe,
  Loader2,
  Rocket,
  Search,
  Shield,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { API_BASE, FIREBASE_HOSTING_URL } from '../lib/firebase.js';
import { auditWebsiteClient, deriveSiteName, isFirebaseHosting, shouldUseClientAudit } from '../services/clientAudit.js';

const TECH_ICONS = {
  React: Code2,
  WordPress: Globe,
  Vue: Code2,
  Angular: Code2,
  Next: Rocket,
  Nginx: Shield,
  default: Cpu,
};

function getTechIcon(name) {
  for (const [key, Icon] of Object.entries(TECH_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return TECH_ICONS.default;
}

function ScoreRing({ label, score, color }) {
  const value = score ?? 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-100">
          {score !== null ? value : '—'}
        </span>
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState(null);

  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('yashkumarsahu789/seoexpert');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [patchLoading, setPatchLoading] = useState(false);
  const [patchResult, setPatchResult] = useState(null);
  const [patchError, setPatchError] = useState(null);

  useEffect(() => {
    if (!auditData?.url) return;
    const existingTitle = auditData.lighthouse?.metaTags?.title?.value;
    const siteName = deriveSiteName(auditData.url);
    setCustomTitle(existingTitle || `Welcome to ${siteName}`);
    setCustomDescription('');
  }, [auditData]);

  async function handleAnalyze(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAuditData(null);
    setPatchResult(null);
    setPatchError(null);

    try {
      if (shouldUseClientAudit()) {
        const data = await auditWebsiteClient(url);
        setAuditData(data);
        return;
      }

      const res = await fetch(`${API_BASE}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Backend returned an invalid response.');
      }

      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setAuditData(data);
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        try {
          const data = await auditWebsiteClient(url);
          setAuditData(data);
          return;
        } catch (fallbackErr) {
          setError(fallbackErr.message || 'Audit failed');
          return;
        }
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePatchDeploy() {
    if (shouldUseClientAudit()) {
      setPatchError(
        `Full patch & deploy needs Firebase backend. Open ${FIREBASE_HOSTING_URL} or run npm run dev locally.`
      );
      return;
    }

    if (!customTitle.trim()) {
      setPatchError('Please enter your website title for the SEO patch.');
      return;
    }
    if (!customDescription.trim()) {
      setPatchError('Please write 1–2 lines about your business for the meta description.');
      return;
    }

    setPatchLoading(true);
    setPatchError(null);
    setPatchResult(null);

    try {
      const res = await fetch(`${API_BASE}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditData,
          token: githubToken,
          repo: githubRepo,
          branch: 'main',
          seoContent: {
            customTitle: customTitle.trim(),
            customDescription: customDescription.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Patch deploy failed');
      setPatchResult(data);
    } catch (err) {
      setPatchError(err.message);
    } finally {
      setPatchLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />

      <header className="relative border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">SEO Expert</h1>
              <p className="text-xs text-slate-500">AI-Driven Ecosystem Optimization</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-400 sm:flex">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            {isFirebaseHosting() ? 'Full Backend Mode' : 'GitHub Pages · Lite Audit'}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-10">
        {!auditData && (
          <section className="mx-auto max-w-2xl pt-16 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Analyze Your Web Ecosystem
            </h2>
            <p className="mb-10 text-slate-400">
              Detect tech stack, run SEO audits, and deploy custom meta-tag fixes — no AI key required.
              {shouldUseClientAudit() && (
                <span className="mt-2 block text-amber-300/90">
                  Lite mode on GitHub Pages. For Lighthouse scores + GitHub push, use{' '}
                  <a href={FIREBASE_HOSTING_URL} className="underline" target="_blank" rel="noreferrer">
                    Firebase Hosting
                  </a>
                  .
                </span>
              )}
            </p>

            <form onSubmit={handleAnalyze} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/80 py-4 pl-12 pr-4 text-slate-100 placeholder:text-slate-600 outline-none ring-emerald-500/0 transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Analyze Ecosystem
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left text-sm text-red-300">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                {error}
              </div>
            )}
          </section>
        )}

        {auditData && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Audited URL</p>
                <p className="font-mono text-emerald-400">{auditData.url}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuditData(null);
                  setUrl('');
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
              >
                New Audit
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
              {auditData.lighthouse.scores.performance !== null ? (
                <>
                  <ScoreRing label="Performance" score={auditData.lighthouse.scores.performance} color="#f59e0b" />
                  <ScoreRing label="Accessibility" score={auditData.lighthouse.scores.accessibility} color="#3b82f6" />
                  <ScoreRing label="SEO" score={auditData.lighthouse.scores.seo} color="#10b981" />
                </>
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-6 py-4 text-sm text-amber-200">
                  Browser audit mode — meta tags, headings, and tech stack analyzed live.
                  {auditData.lighthouse.note ? ` ${auditData.lighthouse.note}` : ''}
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="mb-5 flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold">Detected Tech Stack</h3>
                </div>

                {auditData.techStack.technologies.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {auditData.techStack.error || 'No technologies detected'}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {auditData.techStack.technologies.map((tech) => {
                      const Icon = getTechIcon(tech.name);
                      return (
                        <div
                          key={tech.name}
                          className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-emerald-500/30"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                            <Icon className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-100">{tech.name}</p>
                            <p className="truncate text-xs text-slate-500">
                              {tech.categories.join(' · ') || 'Technology'}
                              {tech.version ? ` · v${tech.version}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="mb-5 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h3 className="text-lg font-semibold">Critical SEO Report</h3>
                </div>

                <ul className="space-y-3">
                  {auditData.seoIssues.map((issue) => (
                    <li
                      key={issue}
                      className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200"
                    >
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      {issue}
                    </li>
                  ))}
                  {auditData.seoIssues.length === 0 && (
                    <li className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      No critical SEO issues detected
                    </li>
                  )}
                </ul>

                <div className="mt-6 space-y-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
                  <p>Meta Title: {auditData.lighthouse.metaTags.title.present ? '✓' : '✗ Missing'}</p>
                  <p>Meta Description: {auditData.lighthouse.metaTags.description.present ? '✓' : '✗ Missing'}</p>
                  <p>OpenGraph: {auditData.lighthouse.metaTags.openGraph.titlePresent ? '✓' : '✗ Incomplete'}</p>
                  <p>
                    Headings — H1:{auditData.lighthouse.headings.counts.h1} H2:
                    {auditData.lighthouse.headings.counts.h2} H3:
                    {auditData.lighthouse.headings.counts.h3}
                  </p>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-900/40 p-6">
              <div className="mb-5 flex items-center gap-2">
                <Rocket className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-semibold">Custom SEO Patch & Deploy</h3>
              </div>
              <p className="mb-5 text-sm text-slate-400">
                Apna custom title aur description likho — backend bina AI key ke perfect meta tags banake GitHub par
                push karega. Har site ka content unique rahega.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Website Title (meta title)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. LifeSolveNow — Digital Services for Local Shops"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Meta Description (2 lines about your business)
                  </label>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    rows={3}
                    placeholder="e.g. LifeSolveNow helps local shopkeepers go online with easy websites, SEO, and digital marketing."
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  GitHub Repository (owner/repo)
                </label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Enter GitHub Personal Access Token to Auto-Fix
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                type="button"
                onClick={handlePatchDeploy}
                disabled={
                  patchLoading ||
                  !githubToken ||
                  !githubRepo ||
                  !customTitle.trim() ||
                  !customDescription.trim()
                }
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-base font-bold text-slate-950 transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {patchLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating & Deploying…
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5" />
                    Authorize Patch & Deploy
                  </>
                )}
              </button>

              {patchError && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  {patchError}
                </div>
              )}

              {patchResult && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-semibold">Patch deployed successfully!</p>
                      {patchResult.deployResult?.commitUrl && (
                        <a
                          href={patchResult.deployResult.commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-emerald-400 underline"
                        >
                          View commit on GitHub →
                        </a>
                      )}
                      {patchResult.patchResult?.summary && (
                        <p className="mt-2 text-slate-400">{patchResult.patchResult.summary}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
