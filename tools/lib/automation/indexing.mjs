import { httpGet } from './serp.mjs'

export async function pingSitemap(sitemapUrl) {
  const ping = { google: false, bing: false }
  try {
    await httpGet(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`)
    ping.google = true
  } catch {
    /* optional */
  }
  try {
    await httpGet(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`)
    ping.bing = true
  } catch {
    /* optional */
  }
  return ping
}
