import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const css = fs.readFileSync(
  path.join(root, "coupon-sites/sunlu-responsive-whtml.css"),
  "utf8"
);
const splitAt = css.indexOf(".nav-menu-two");
const p1 = css.slice(0, splitAt);
const p2 = css.slice(splitAt);

const hook =
  '<div class="sunlu-responsive-hook" aria-hidden="true"></div>';
const parent = {
  component: "6a3d6a0241d6f793eb3d598f",
  element: "6a3d6a3da70c9e3077b63e2a",
};

const body = {
  siteId: "6a3d69ff41d6f793eb3d5952",
  pageId: "6a3d6a0241d6f793eb3d598f",
  context:
    "Injecting split mobile-first responsive CSS into Sunlu Promo Hub home page for tablet, laptop, and mobile breakpoints.",
  actions: [
    {
      build_label: "responsive-css-part1",
      parent_element_id: parent,
      creation_position: "prepend",
      html: hook,
      css: p1,
    },
    {
      build_label: "responsive-css-part2",
      parent_element_id: parent,
      creation_position: "prepend",
      html: hook,
      css: p2,
    },
  ],
};

const out = path.join(root, "coupon-sites/mcp-whtml-split.json");
fs.writeFileSync(out, JSON.stringify(body));
console.log("Wrote", out, p1.length, p2.length);
