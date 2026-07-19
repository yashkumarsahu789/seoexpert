const c = await fetch('https://sunlu-promo-hub.webflow.io/').then((r) => r.text());
const logo = c.match(/navbar-brand-2[\s\S]*?src="([^"]*)"/);
const nav = [...c.matchAll(/nav-link-5[^>]*><strong>([^<]+)<\/strong>/g)].map((m) => m[1]);
console.log('logo:', logo?.[1] || '(empty)');
console.log('nav:', nav.join(', '));
console.log('misplaced:', c.includes('Create Your Sunlu Account'));
console.log('wrapper:', c.includes('navbar-wrapper-2'));
