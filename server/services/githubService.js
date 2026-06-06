import { Octokit } from '@octokit/rest';
import { applySeoTemplates } from './templatePatchService.js';
import { generateSecurityHeadersPatch } from './infrastructurePatchService.js';

function parseRepo(repoInput) {
  const trimmed = repoInput.trim().replace(/^https:\/\/github\.com\//i, '').replace(/\.git$/, '');
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('Repository must be in format owner/repo or full GitHub URL');
  }
  return { owner: parts[0], repo: parts[1] };
}

async function getFileContent(octokit, owner, repo, path, ref) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
    if (Array.isArray(data) || data.type !== 'file') {
      return null;
    }
    return {
      sha: data.sha,
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
    };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

function applyPatch(existingContent, patch) {
  if (patch.mode === 'template') {
    return applySeoTemplates(existingContent, patch.auditData);
  }
  if (patch.mode === 'content' && patch.content) {
    return patch.content;
  }
  if (patch.mode === 'security-headers') {
    return generateSecurityHeadersPatch(existingContent, patch.configType);
  }
  if (patch.content) {
    return patch.content;
  }
  if (patch.searchReplace?.search !== undefined) {
    const { search, replace } = patch.searchReplace;
    if (!existingContent.includes(search)) {
      throw new Error(`Search string not found in ${patch.path}`);
    }
    return existingContent.replace(search, replace);
  }
  throw new Error(`Invalid patch format for ${patch.path}`);
}

export async function pushSeoPatches({ token, repo, branch = 'main', patches }) {
  if (!token) throw new Error('GitHub Personal Access Token is required');
  if (!repo) throw new Error('Repository name is required');
  if (!patches?.length) throw new Error('No patches provided');

  const { owner, repo: repoName } = parseRepo(repo);
  const octokit = new Octokit({ auth: token });

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo: repoName,
    ref: `heads/${branch}`,
  });
  const latestCommitSha = refData.object.sha;

  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo: repoName,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commitData.tree.sha;

  const treeItems = [];

  for (const patch of patches) {
    const existing = await getFileContent(octokit, owner, repoName, patch.path, branch);
    let newContent;

    if (patch.mode === 'security-headers') {
      newContent = generateSecurityHeadersPatch(existing?.content || '{}', patch.configType);
      if (!newContent) continue;
    } else if (existing) {
      newContent = applyPatch(existing.content, patch);
    } else {
      newContent =
        patch.fallbackContent ||
        patch.content ||
        (() => {
          throw new Error(`Cannot create ${patch.path} without template fallback`);
        })();
    }

    const { data: blob } = await octokit.git.createBlob({
      owner,
      repo: repoName,
      content: newContent,
      encoding: 'utf-8',
    });

    treeItems.push({
      path: patch.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo: repoName,
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo: repoName,
    message: 'style(seo): automated autonomous AI deployment optimization patch',
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  await octokit.git.updateRef({
    owner,
    repo: repoName,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return {
    success: true,
    commitSha: newCommit.sha,
    commitUrl: `https://github.com/${owner}/${repoName}/commit/${newCommit.sha}`,
    filesUpdated: patches.map((p) => p.path),
  };
}
