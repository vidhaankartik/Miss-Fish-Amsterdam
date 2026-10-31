// Netlify runs this automatically when a form submission is VERIFIED.
// See: https://docs.netlify.com/build/functions/trigger-on-events/
// This function is NOT a public vote endpoint. It stores no names, IPs or emails.
import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

const FISH = Object.freeze({
  'Percia the Perch': 'percia',
  'Stella the Stickleback': 'stella',
  'Bella the Bullhead': 'bella',
  'Roxy the Roach': 'roxy'
});

export default {
  async formSubmitted(event) {
    const data = event?.data;
    if (!data || typeof data.fish !== 'string') return;
    // The site currently has only one poll form; ignore unrelated forms.
    const formName = data['form-name'];
    if (formName && formName !== 'miss-fish-vote') return;
    const slug = FISH[data.fish];
    if (!slug) return;
    // One immutable blob per verified vote avoids lost counts from simultaneous
    // writes to a shared counter. The key is opaque, not linked to any visitor.
    const store = getStore({ name: 'miss-fish-verified-votes-2026', region: 'eu-central-1', consistency: 'strong' });
    await store.set(`votes/${slug}/${randomUUID()}`, '1');
  }
};
