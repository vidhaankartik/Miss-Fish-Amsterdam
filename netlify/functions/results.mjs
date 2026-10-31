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

export default async function results(request) {
  if (request.method !== 'GET') return json({message:'Method not allowed'},405);
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.SITE_ID;
  if (!token || !siteId) {
    return json({message:'Live results need one-time Netlify setup: add NETLIFY_API_TOKEN to this site’s environment variables, then redeploy. See README.md.'},503);
  }
  try {
    const forms = await netlifyGet(`/sites/${encodeURIComponent(siteId)}/forms`,token);
    if (!Array.isArray(forms)) throw new Error('The API returned invalid form data');
    const targetForm = forms.find(item => item.name === FORM_NAME);
    if (!targetForm) {
      return json({message:'No miss-fish-vote form was found. Turn on Netlify Forms detection, redeploy, and submit a test vote.'},503);
    }
    const counts = {percia:0,stella:0,bella:0,roxy:0};
    const formId = encodeURIComponent(targetForm.id);
    let reachedEnd = false;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const submissions = await netlifyGet(`/forms/${formId}/submissions?page=${page}&per_page=100`,token);
      if (!Array.isArray(submissions)) throw new Error('Invalid submission response');
      for (const submission of submissions) {
        const choice = submission && submission.data && submission.data.fish;
        if (typeof choice === 'string' && Object.hasOwn(FISH,choice)) {
          counts[FISH[choice]] += 1;
        }
      }
      if (submissions.length < 100) { reachedEnd = true; break; }
    }
    if (!reachedEnd) {
      // Fail clearly rather than claiming to show complete totals when capped.
      return json({message:'More than 5,000 votes were submitted. Ask the site administrator to export and verify the full totals.'},503);
    }
    return json({counts,total:Object.values(counts).reduce((a,b)=>a+b,0),source:'verified-netlify-forms',updatedAt:new Date().toISOString()});
  } catch (error) {
    console.error('Could not load Netlify Form results:',error.message);
    return json({message:'Live vote totals are temporarily unavailable. Check the Netlify Function logs and API token, then try again.'},502);
  }
}
