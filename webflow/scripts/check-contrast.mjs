const c = await fetch('https://sunlu-promo-hub.webflow.io/').then((r) => r.text());
console.log('contrast script:', c.includes('sunlucontrastfix'));
const scriptUrl =
  'https://cdn.prod.website-files.com/6a3d69ff41d6f793eb3d5952%2F689e5ba67671442434f3ca35%2F6a3f9cb4c2379c68e7e10093%2Fsunlucontrastfix-1.0.0.js';
const js = await fetch(scriptUrl).then((r) => r.text());
console.log('script loaded:', js.includes('sunlu-contrast-fix'));
console.log('has white rule:', js.includes('#fff'));
