import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const css = fs
  .readFileSync(path.join(root, "coupon-sites/sunlu-responsive-flat.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .trim();

const MAX = 3400;
const rules = css.match(/[^}]+}/g) || [];
const chunks = [];
let buf = "";

for (const rule of rules) {
  const next = buf ? buf + "\n\n" + rule : rule;
  if (next.length > MAX && buf) {
    chunks.push(buf.trim());
    buf = rule;
  } else {
    buf = next;
  }
}
if (buf.trim()) chunks.push(buf.trim());

const hook =
  '<div class="sunlu-responsive-hook" aria-hidden="true"></div>';
const parent = {
  component: "6a3d6a0241d6f793eb3d598f",
  element: "6a3d6a3da70c9e3077b63e2a",
};

const batches = [];
for (let i = 0; i < chunks.length; i += 5) {
  const slice = chunks.slice(i, i + 5);
  batches.push({
    siteId: "6a3d69ff41d6f793eb3d5952",
    pageId: "6a3d6a0241d6f793eb3d598f",
    context:
      "Injecting flat mobile-first responsive CSS chunk into Sunlu Promo Hub home page for cross-device layout and typography fixes.",
    actions: slice.map((cssChunk, j) => ({
      build_label: `responsive-flat-${i + j + 1}`,
      parent_element_id: parent,
      creation_position: "prepend",
      html: hook,
      css: cssChunk,
    })),
  });
}

const outDir = path.join(root, "coupon-sites/whtml-batches");
fs.mkdirSync(outDir, { recursive: true });
batches.forEach((b, idx) => {
  fs.writeFileSync(
    path.join(outDir, `batch-${idx + 1}.json`),
    JSON.stringify(b)
  );
});

console.log(
  `CSS ${css.length} chars -> ${chunks.length} chunks in ${batches.length} batches`
);
chunks.forEach((c, i) => console.log(`  chunk ${i + 1}: ${c.length}`));
