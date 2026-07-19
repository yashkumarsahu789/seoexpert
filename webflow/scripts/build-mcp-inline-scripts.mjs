import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const css = fs
  .readFileSync(path.join(root, "coupon-sites/sunlu-responsive-site.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .trim();

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

const init =
  "(function(){var s=document.getElementById('sunlu-responsive-site');if(!s){s=document.createElement('style');s.id='sunlu-responsive-site';document.head.appendChild(s);}s.textContent='';})();";

const maxChunk = 850;
const parts = [];
for (let i = 0; i < css.length; i += maxChunk) {
  parts.push(css.slice(i, i + maxChunk));
}

const scripts = [
  {
    label: "reg-init",
    register_inline_script: {
      site_id: "6a3d69ff41d6f793eb3d5952",
      source_code: init,
      version: "1.0.0",
      display_name: "SunluResponsiveInit",
    },
  },
];

for (let i = 0; i < parts.length; i++) {
  const part = esc(parts[i]);
  const sourceCode = `(function(){var s=document.getElementById('sunlu-responsive-site');if(s)s.textContent+=\`${part}\`;})();`;
  if (sourceCode.length > 2000) {
    throw new Error(`Chunk ${i + 1} too large: ${sourceCode.length}`);
  }
  scripts.push({
    label: `reg-css-${i + 1}`,
    register_inline_script: {
      site_id: "6a3d69ff41d6f793eb3d5952",
      source_code: sourceCode,
      version: "1.0.0",
      display_name: `SunluResponsiveCss${i + 1}`,
    },
  });
}

fs.writeFileSync(
  path.join(root, "coupon-sites/mcp-inline-scripts-register.json"),
  JSON.stringify({ scripts, partCount: parts.length })
);
console.log(`Prepared ${scripts.length} register actions, ${parts.length} CSS parts`);
