import { getStore } from '@netlify/blobs';
// Private read-only vote aggregator for Netlify Forms.
// NEVER place the NETLIFY_API_TOKEN in HTML, client-side JS, or this file.
// The browser only receives aggregate counts; submission metadata stays private.
const FISH = Object.freeze({
  'Percia the Perch':'percia',
  'Stella the Stickleback':'stella',
  'Bella the Bullhead':'bella',
  'Roxy the Roach':'roxy'
});
const FORM_NAME = 'miss-fish-vote';
const API_BASE = 'https://api.netlify.com/api/v1';
const MAX_PAGES = 50; // safety cap: up to 5,000 submissions

function json(value, status=200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'
    }
  });
}
async function netlifyGet(path, token) {
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),8000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {Authorization:`Bearer ${token}`,Accept:'application/json'},
      signal:controller.signal
    });
    if (!response.ok) throw new Error(`Netlify API returned HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

// Token-free mode uses individually stored VERIFIED form events (not browser claims).
// It starts counting only after the event handler is deployed. It cannot read
// historical Netlify Forms submissions without an authenticated Netlify API call.

const STORE = 'miss-fish-verified-votes-2026';
const REGION = 'eu-central-1';
function freshCounts() { return {percia:0,stella:0,bella:0,roxy:0}; }

async function fromVerifiedEvents() {
  const store = getStore({name: STORE, region: REGION, consistency: 'strong'});
  const {blobs} = await store.list({prefix:'votes/'});
  const counts = freshCounts();
  for (const blob of blobs) {
    const match = /^votes\/(percia|stella|bella|roxy)\/[0-9a-f-]{36}$/.exec(blob.key);
    if (match) counts[match[1]] += 1;
  }
  return {counts,total:Object.values(counts).reduce((a,b)=>a+b,0),source:'verified-netlify-events',updatedAt:new Date().toISOString()};
}

async function fromFormAPI(token,siteId) {
  const forms = await netlifyGet(`/sites/${encodeURIComponent(siteId)}/forms`,token);
  if (!Array.isArray(forms)) throw new Error('Invalid form response');
  const target = forms.find(item=>item.name===FORM_NAME);
  if (!target) throw new Error('Miss Fish form not found in Netlify');
  const counts = freshCounts();
  let complete = false;
  for (let page=1; page<=MAX_PAGES; page++) {
    const submissions = await netlifyGet(`/forms/${encodeURIComponent(target.id)}/submissions?page=${page}&per_page=100`,token);
    if (!Array.isArray(submissions)) throw new Error('Invalid submissions response');
    for (const item of submissions) {
      const choice = item?.data?.fish;
      if (typeof choice === 'string' && Object.hasOwn(FISH,choice)) counts[FISH[choice]]++;
    }
    if (submissions.length < 100) { complete=true; break; }
  }
  if (!complete) throw new Error('Exceeded 5,000 verified Netlify Form submissions');
  return {counts,total:Object.values(counts).reduce((a,b)=>a+b,0),source:'verified-netlify-forms',updatedAt:new Date().toISOString()};
}

export default async function results(request) {
  if (request.method !== 'GET') return json({message:'Method not allowed'},405);
  try {
    // Optional: if already configured, the API shows ALL historical Forms votes.
    // Without it, the event-based live ledger works automatically for new votes.
    const token = process.env.NETLIFY_API_TOKEN;
    const siteId = process.env.SITE_ID;
    if (token && siteId) {
      try { return json(await fromFormAPI(token,siteId)); }
      catch (error) {
        console.warn('Historical Netlify Forms API is unavailable; switching to verified event ledger:',error.message);
      }
    }
    return json(await fromVerifiedEvents());
  } catch (error) {
    console.error('Miss Fish live results unavailable:',error);
    return json({message:'Live results are temporarily unavailable. Please try refreshing in a moment.'},503);
  }
}
