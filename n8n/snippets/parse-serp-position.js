// n8n Code Node — parse SERP API response, find our shop position
// Input: $json from SerpAPI / ValueSerp HTTP Request
// Config: set OUR_DOMAIN = shop.LifeSolveNow.com

const OUR_DOMAIN = 'shop.lifesolvenow.com';
const TARGET_POSITION = 3;

const organic =
  $json.organic_results ||
  $json.organic ||
  $json.results?.organic ||
  [];

let position = null;
let competitorUrl = null;

for (let i = 0; i < organic.length; i++) {
  const link = (organic[i].link || organic[i].url || '').toLowerCase();
  if (link.includes(OUR_DOMAIN)) {
    position = i + 1;
    break;
  }
  if (!competitorUrl && i < TARGET_POSITION) {
    competitorUrl = organic[i].link || organic[i].url;
  }
}

const previousPosition = $('Supabase').item?.json?.last_rank_position ?? null;
const isRankDrop =
  position !== null &&
  previousPosition !== null &&
  position > previousPosition;

const needsBoost =
  isRankDrop || (position !== null && position > TARGET_POSITION);

return {
  json: {
    google_position: position,
    competitor_url: competitorUrl,
    competitor_position: position ? TARGET_POSITION : null,
    previous_position: previousPosition,
    is_rank_drop: isRankDrop,
    needs_boost: needsBoost,
    target_position: TARGET_POSITION,
    checked_at: new Date().toISOString(),
  },
};
