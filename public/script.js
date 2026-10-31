'use strict';
(() => {
  const form = document.querySelector('#vote-form');
  const ballot = document.querySelector('#ballot');
  const options = [...document.querySelectorAll('input[name="fish"]')];
  const submit = document.querySelector('#submit-vote');
  const error = document.querySelector('#vote-error');
  const success = document.querySelector('#vote-success');
  const successMessage = document.querySelector('#success-message');
  const preview = document.querySelector('#preview-notice');
  const resultsToggle = document.querySelector('#results-toggle');
  const resultsOverlay = document.querySelector('#results-overlay');
  const resultsPanel = document.querySelector('#results-panel');
  const closeResultsButton = document.querySelector('#close-results');
  const resultsStatus = document.querySelector('#results-status');
  const resultsContent = document.querySelector('#results-content');
  const refreshResults = document.querySelector('#refresh-results');
  const resultsTotal = document.querySelector('#results-total');
  const resultsDisclaimer = document.querySelector('#results-disclaimer');
  const winnerName = document.querySelector('#winner-name');
  const winnerCaption = document.querySelector('#winner-caption');
  const winnerBanner = document.querySelector('#winner-banner');
  const STORAGE_KEY = 'miss-fish-2026-voted-v1'; // deliberately keep the old key
  const isPreview = ['localhost','127.0.0.1',''].includes(location.hostname) || location.protocol === 'file:';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fishNames = {
    percia: 'Percia the Perch',
    stella: 'Stella the Stickleback',
    bella: 'Bella the Bullhead',
    roxy: 'Roxy the Roach'
  };
  const resultRows = Object.fromEntries([...document.querySelectorAll('[data-result]')].map(row => [row.dataset.result,row]));
  let resultsLoading = false;

  function getSavedVote() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }
  function saveVote(fish) {
    try { localStorage.setItem(STORAGE_KEY, fish); } catch (_) { /* Private browsing may block storage */ }
  }
  function highlightFish(slug, animate = true) {
    document.querySelectorAll('[data-fish-card]').forEach(card => {
      const isSelected = card.dataset.fishCard === slug;
      card.classList.toggle('is-selected', isSelected);
      card.classList.remove('just-selected');
      if (isSelected && animate && !reduceMotion) {
        // Restart the spotlight animation when visitors change their selection.
        void card.offsetWidth;
        card.classList.add('just-selected');
      }
    });
    document.querySelectorAll('[data-select]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.select === slug));
    });
  }
  function selectedSlug(fish) {
    return Object.keys(fishNames).find(slug => fishNames[slug] === fish) || null;
  }
  function launchCelebration() {
    if (reduceMotion) return;
    const layer = document.querySelector('#celebration-layer');
    if (!layer) return;
    layer.replaceChildren();
    const colors = ['#7ad1ba','#b1e6cd','#e8bb69','#a0d4f2','#ffffff'];
    for (let i = 0; i < 33; i++) {
      const dot = document.createElement('i');
      dot.className = 'celebration-particle' + (i % 6 === 0 ? ' is-spark' : '');
      dot.style.setProperty('--bubble-size', `${6 + (i * 7) % 14}px`);
      dot.style.setProperty('--bubble-left', `${6 + (i * 37) % 88}%`);
      dot.style.setProperty('--bubble-color', colors[i % colors.length]);
      dot.style.setProperty('--bubble-time', `${1.9 + (i % 8) * .17}s`);
      dot.style.setProperty('--bubble-delay', `${(i % 7) * .09}s`);
      dot.style.setProperty('--bubble-drift', `${((i * 29) % 100) - 50}px`);
      layer.append(dot);
    }
  }
  function showSuccess(fish, isDemo = false, alreadyVoted = false) {
    form.hidden = true;
    success.hidden = false;
    const slug = selectedSlug(fish);
    if (slug) highlightFish(slug, false);
    successMessage.textContent = isDemo
      ? `Preview only: you chose ${fish}. This test wasn't submitted online. Publish with Netlify to collect votes.`
      : alreadyVoted
        ? `You already chose ${fish} on this browser. Thanks for joining the Fish Hotel vote!`
        : `Your vote for ${fish} has been submitted. Thanks for meeting Amsterdam's underwater neighbours!`;
    if (!alreadyVoted) launchCelebration();
  }
  function chooseFish(slug) {
    const chosen = fishNames[slug];
    if (!chosen) return;
    if (getSavedVote()) {
      ballot.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
      return;
    }
    const radio = options.find(item=>item.value === chosen);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change',{bubbles:true}));
    ballot.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
    setTimeout(() => {try {radio.focus({preventScroll:true});} catch (_) {}},reduceMotion?0:320);
  }

  options.forEach(option => option.addEventListener('change', () => {
    if (option.checked) highlightFish(selectedSlug(option.value));
  }));
  document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => chooseFish(button.dataset.select)));
  if (preview) preview.hidden = !isPreview;
  const previouslyVoted = getSavedVote();
  if (previouslyVoted) showSuccess(previouslyVoted, isPreview, true);

  async function loadResults() {
    if (resultsLoading) return;
    resultsLoading = true;
    refreshResults.disabled = true;
    resultsStatus.hidden = false;
    resultsStatus.classList.remove('is-error');
    resultsStatus.textContent = isPreview ? 'Preview mode: shared results are only available after Netlify deployment.' : 'Counting verified votes…';
    try {
      if (isPreview) throw new Error('This preview cannot access online results. Deploy the project to your existing Netlify site to view live votes.');
      const response = await fetch('/.netlify/functions/results', { headers: { Accept: 'application/json' },cache:'no-store' });
      let payload;
      try { payload = await response.json(); } catch (_) { throw new Error('Results service is not running yet. Deploy the Netlify Function using the instructions in README.md.'); }
      if (!response.ok || !payload || !payload.counts) {
        throw new Error((payload && payload.message) || 'The leaderboard could not load right now. Please try again soon.');
      }
      const counts = {};
      for (const slug of Object.keys(fishNames)) {
        const count = payload.counts[slug];
        if (!Number.isSafeInteger(count) || count < 0) throw new Error('Unexpected results data. Please refresh.');
        counts[slug] = count;
      }
      const total = Object.values(counts).reduce((a,b)=>a+b,0);
      // Sort is only used to find the leader. Display rows stay in poster order.
      const ranked = Object.keys(fishNames).sort((a,b)=>counts[b]-counts[a]);
      const maxCount = counts[ranked[0]];
      const leaders = maxCount > 0 ? ranked.filter(key=>counts[key]===maxCount) : [];
      if (leaders.length === 0) {
        winnerName.textContent = 'The crown is still up for grabs';
        winnerCaption.textContent = 'Be the first to cast your vote.';
      } else if (leaders.length === 1) {
        winnerName.textContent = fishNames[leaders[0]];
        winnerCaption.textContent = `${counts[leaders[0]]} ${counts[leaders[0]]===1?'vote':'votes'} and counting`;
      } else {
        winnerName.textContent = 'It’s a tie!';
        winnerCaption.textContent = leaders.map(slug=>fishNames[slug].split(' ')[0]).join(' · ') + ' are sharing the lead';
      }
      for (const slug of Object.keys(fishNames)) {
        const row = resultRows[slug];
        const percent = total ? (counts[slug] / total * 100) : 0;
        row.querySelector('[data-percent]').textContent = `${Math.round(percent)}%`;
        row.querySelector('[data-votes]').textContent = `${counts[slug]} ${counts[slug]===1?'vote':'votes'}`;
        row.querySelector('[data-bar]').style.width = `${percent.toFixed(3)}%`;
        row.classList.toggle('is-leader',leaders.includes(slug));
      }
      resultsTotal.textContent = `${total} verified ${total===1?'vote':'votes'} counted`;
      if (resultsDisclaimer) {
        resultsDisclaimer.textContent = payload.source === 'verified-netlify-forms'
          ? 'An informal community poll, not a scientific sample. Counts include verified Netlify Forms submissions, including earlier votes. Figures may take a moment to update.'
          : 'An informal community poll, not a scientific sample. Counts include verified submissions since this leaderboard update was deployed. Earlier Netlify Forms votes are not included unless imported separately; verification can take a moment.';
      }
      resultsContent.hidden = false;
      resultsStatus.hidden = true;
    } catch (e) {
      resultsStatus.hidden = false;
      resultsStatus.classList.add('is-error');
      resultsStatus.textContent = e.message;
      // Never show stale or fabricated results when a refresh fails.
      resultsContent.hidden = true;
      console.warn('Miss Fish leaderboard:',e.message);
    } finally {
      resultsLoading = false;
      refreshResults.disabled = false;
    }
  }
  // Reveal the leaderboard only after a vote has been successfully submitted
  // (or after a previously submitted vote is restored on this browser).
  function revealResults() {
    if (!getSavedVote() || !form.hidden) return;
    resultsOverlay.hidden = false;
    document.body.classList.add('results-open');
    resultsToggle.setAttribute('aria-expanded', 'true');
    closeResultsButton.focus({preventScroll:true});
    void loadResults();
  }
  function closeResults() {
    if (resultsOverlay.hidden) return;
    resultsOverlay.hidden = true;
    document.body.classList.remove('results-open');
    resultsToggle.setAttribute('aria-expanded', 'false');
    resultsToggle.focus({preventScroll:true});
  }
  resultsToggle.addEventListener('click', revealResults);
  closeResultsButton.addEventListener('click', closeResults);
  resultsOverlay.addEventListener('click', (event) => {
    if (event.target === resultsOverlay) closeResults();
  });
  document.addEventListener('keydown', (event) => {
    if (resultsOverlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeResults(); return; }
    if (event.key === 'Tab') {
      const focusables = [...resultsPanel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  refreshResults.addEventListener('click',loadResults);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    const selected = form.querySelector('input[name="fish"]:checked');
    if (!selected) {
      error.textContent = 'Choose a fish before submitting your vote.';
      error.hidden = false;
      return;
    }
    const existing = getSavedVote();
    if (existing) { showSuccess(existing,isPreview,true); return; }
    submit.disabled = true;
    submit.textContent = isPreview ? 'Saving test vote…' : 'Sending your vote…';
    try {
      if (!isPreview) {
        const payload = new URLSearchParams(new FormData(form)).toString();
        const response = await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:payload});
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
      }
      saveVote(selected.value);
      showSuccess(selected.value,isPreview,false);
      success.scrollIntoView({behavior:'auto',block:'center'});
      // The results button is now inside the post-vote confirmation.
      // Do not reveal the leaderboard automatically: visitors decide when to view it.
      // A fresh count is loaded whenever that button is pressed.
    } catch (e) {
      error.textContent = 'Your vote could not be submitted. Check your connection and Netlify Forms, then try again.';
      error.hidden = false;
      submit.disabled = false;
      submit.innerHTML = 'Try voting again <span aria-hidden="true">↗</span>';
      console.error('Miss Fish vote submission error:',e);
    }
  });
})();
