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
  const milestoneBanner = document.querySelector('#milestone-banner');
  const milestoneHeading = document.querySelector('#milestone-heading');
  const milestoneDescription = document.querySelector('#milestone-description');
  const rivalryQuote = document.querySelector('#rivalry-quote');
  const swimBubble = document.querySelector('#vote-swim');
  const swimImage = document.querySelector('#vote-swim-image');
  const QUIZ_STORAGE = 'miss-fish-2026-quiz-session-v1';
  const MODE_STORAGE = 'miss-fish-2026-night-mode';
  const fishProfiles = {
    percia: {first:'Percia',title:'Percia the Perch',tag:'The stylish strategist',description:'You have an eye for detail and know when to make an entrance. Just like Percia, you can blend in when you want to — and stand out when it counts.',rivalry:'Percia’s stripes aren’t hiding that lead!'},
    stella: {first:'Stella',title:'Stella the Stickleback',tag:'The tiny powerhouse',description:'You might be underestimated, but that is their mistake. You have big confidence, quick instincts and plenty of personality.',rivalry:'Small fish, huge lead. Stella means business!'},
    bella: {first:'Bella',title:'Bella the Bullhead',tag:'The mysterious night owl',description:'You are quietly confident, observant and happiest doing things your own way. Bella knows the best adventures happen off the beaten path.',rivalry:'Bella has emerged from the shadows to take the lead!'},
    roxy: {first:'Roxy',title:'Roxy the Roach',tag:'The social superstar',description:'You bring people together, make any outing more fun and thrive with your crew. Roxy would absolutely save you a spot in her shoal.',rivalry:'Roxy and her crew are making a splash at the top!'}
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
    if (!alreadyVoted) {
      launchCelebration();
      animateVoteSwim(slug);
    }
  }
  function animateVoteSwim(slug) {
    if (reduceMotion || !slug || !swimBubble || !swimImage) return;
    swimImage.src = `assets/${slug}.webp`;
    swimBubble.classList.remove('is-swimming');
    void swimBubble.offsetWidth;
    swimBubble.classList.add('is-swimming');
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
      // User-specific annotation uses the already-saved ballot, not a second submission.
      const savedSlug = selectedSlug(getSavedVote());
      for (const [slug, row] of Object.entries(resultRows)) {
        let tag = row.querySelector('.your-vote-chip');
        if (!tag) {
          tag = document.createElement('span');
          tag.className = 'your-vote-chip';
          tag.textContent = 'Your vote';
          row.querySelector('.result-meta strong').append(' ', tag);
        }
        tag.hidden = slug !== savedSlug;
      }
      // These fun lines only reflect *actual* counts from the verified results API.
      if (total === 0) {
        rivalryQuote.textContent = 'The fish are waiting for their first fan!';
      } else if (leaders.length > 1) {
        rivalryQuote.textContent = `It's neck-and-neck! ${leaders.map(key => fishProfiles[key].first).join(' and ')} are sharing the spotlight.`;
      } else {
        rivalryQuote.textContent = fishProfiles[leaders[0]].rivalry;
      }
      rivalryQuote.hidden = false;
      const thresholds = [10, 25, 50, 100, 250, 500, 1000];
      const lastUnlocked = thresholds.filter(n => total >= n).at(-1) || null;
      if (lastUnlocked) {
        milestoneBanner.hidden = false;
        milestoneHeading.textContent = `${lastUnlocked} votes — milestone unlocked!`;
        milestoneDescription.textContent = `${total} verified votes and counting. Amsterdam’s canal crew is growing!`;
        milestoneBanner.classList.remove('milestone-pop');
        const seen = getSessionMilestone();
        if (lastUnlocked > seen && !reduceMotion) {
          void milestoneBanner.offsetWidth;
          milestoneBanner.classList.add('milestone-pop');
        }
        rememberMilestone(lastUnlocked);
      } else {
        milestoneBanner.hidden = true;
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


  // --- Day / night mode. This choice is saved only on the visitor's browser. ---
  const nightToggle = document.querySelector('#night-toggle');
  function applyNightMode(night) {
    document.documentElement.dataset.theme = night ? 'night' : 'day';
    nightToggle.setAttribute('aria-pressed', String(night));
    const label = night ? 'Switch to day mode' : 'Switch to night mode';
    nightToggle.setAttribute('aria-label', label);
    nightToggle.title = label;
    nightToggle.querySelector('.night-toggle-symbol').textContent = night ? '☀' : '☾';
    try { localStorage.setItem(MODE_STORAGE, night ? 'on' : 'off'); } catch (_) {}
  }
  applyNightMode(document.documentElement.dataset.theme === 'night');
  nightToggle.addEventListener('click', () => applyNightMode(document.documentElement.dataset.theme !== 'night'));

  // --- Swimming aquarium: illustration panels only; they do not cast votes. ---
  const aquariumTank = document.querySelector('#aquarium-tank');
  const aquariumMotion = document.querySelector('#aquarium-motion');
  const aquariumPaused = reduceMotion;
  if (aquariumPaused) {
    aquariumTank.classList.add('is-paused');
    aquariumMotion.disabled = true;
    aquariumMotion.textContent = 'Reduced motion enabled';
  }
  aquariumMotion.addEventListener('click', () => {
    const paused = aquariumTank.classList.toggle('is-paused');
    aquariumMotion.setAttribute('aria-pressed', String(paused));
    aquariumMotion.textContent = paused ? '▶ Resume swimming' : 'Ⅱ Pause swimming';
  });
  document.querySelectorAll('[data-aquarium]').forEach(button => button.addEventListener('click', () => {
    const slug = button.dataset.aquarium;
    const profile = document.querySelector(`[data-fish-card="${slug}"]`);
    if (!profile) return;
    profile.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});
    // Aquarium visits are previews, NOT ballot selections or submitted votes.
    profile.setAttribute('tabindex', '-1');
    profile.focus({preventScroll:true});
    profile.classList.add('aquarium-spotlight');
    setTimeout(() => profile.classList.remove('aquarium-spotlight'), 1800);
  }));

  // --- Fun personality quiz. No personal information, network requests or votes. ---
  const questions = [
    {q:'Your ideal afternoon by the canal?',answers:[['A stylish solo adventure','percia'],['An outing with my whole crew','roxy'],['A peaceful hidden spot','bella'],['Anything a little daring','stella']]},
    {q:'Someone underestimates you. You…',answers:[['Let my confidence do the talking','stella'],['Give them a clever surprise','percia'],['Keep my cards close','bella'],['Bring my friends along for the ride','roxy']]},
    {q:'Pick your secret canal hideout.',answers:[['A leafy underwater garden','percia'],['A snug little nook between stones','bella'],['A lively spot where everyone meets','roxy'],['A tiny fortress I can defend','stella']]},
    {q:'Which superpower sounds best?',answers:[['Blending in at just the right moment','percia'],['Making new friends everywhere','roxy'],['Being unstoppable after dark','bella'],['Being small but fearless','stella']]},
    {q:'Your friends would describe you as…',answers:[['The stylish strategist','percia'],['The lively social butterfly','roxy'],['The mysterious independent one','bella'],['The bold little powerhouse','stella']]}
  ];
  const quizQuestion = document.querySelector('#quiz-question');
  const quizStep = document.querySelector('#quiz-step-label');
  const quizChoices = document.querySelector('#quiz-choices');
  const quizProgress = document.querySelector('#quiz-progress');
  const quizProgressFill = document.querySelector('#quiz-progress-fill');
  const quizBack = document.querySelector('#quiz-back');
  const quizQuestions = document.querySelector('#quiz-questions');
  const quizResult = document.querySelector('#quiz-result');
  const quizResultImage = document.querySelector('#quiz-result-image');
  const quizResultHeading = document.querySelector('#quiz-result-heading');
  const quizResultDescription = document.querySelector('#quiz-result-description');
  const quizVote = document.querySelector('#quiz-vote');
  const quizShare = document.querySelector('#quiz-share');
  const quizShareStatus = document.querySelector('#quiz-share-status');
  const quizRetake = document.querySelector('#quiz-retake');
  let quizAnswers = [];
  let quizMatch = null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(QUIZ_STORAGE));
    if (Array.isArray(stored) && stored.length <= questions.length && stored.every(v => Number.isInteger(v) && v>=0 && v<4)) quizAnswers = stored;
  } catch (_) {}
  function saveQuiz() {
    try { sessionStorage.setItem(QUIZ_STORAGE,JSON.stringify(quizAnswers)); } catch (_) {}
  }
  function pickQuizMatch() {
    const tally = {percia:0,stella:0,bella:0,roxy:0};
    quizAnswers.forEach((choice,i) => tally[questions[i].answers[choice][1]]++);
    const highest = Math.max(...Object.values(tally));
    const tied = Object.keys(tally).filter(slug => tally[slug] === highest);
    // If tied, the most recently chosen tied personality wins consistently.
    for (let i=quizAnswers.length-1;i>=0;i--) {
      const slug=questions[i].answers[quizAnswers[i]][1];
      if (tied.includes(slug)) return slug;
    }
    return 'percia';
  }
  function showQuizResult() {
    quizMatch = pickQuizMatch();
    const profile = fishProfiles[quizMatch];
    quizQuestions.hidden = true;
    quizResult.hidden = false;
    quizResultImage.src = `assets/${quizMatch}.webp`;
    quizResultHeading.textContent = `You're ${profile.first}!`;
    quizResultDescription.textContent = `${profile.tag}. ${profile.description}`;
    quizVote.innerHTML = `Choose ${profile.first} for my vote <span aria-hidden="true">↗</span>`;
    quizShareStatus.textContent = '';
  }
  function renderQuiz() {
    if (quizAnswers.length === questions.length) { showQuizResult(); return; }
    quizMatch = null;
    quizResult.hidden = true;
    quizQuestions.hidden = false;
    const index = quizAnswers.length;
    const current = questions[index];
    quizStep.textContent = `QUESTION ${String(index+1).padStart(2,'0')} OF 05`;
    quizQuestion.textContent = current.q;
    quizProgress.setAttribute('aria-valuenow', String(index));
    quizProgressFill.style.width = `${100 * index / questions.length}%`;
    quizBack.disabled = index === 0;
    quizChoices.replaceChildren();
    current.answers.forEach(([answer], answerIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-choice';
      const letter = document.createElement('span');
      letter.className = 'quiz-choice-letter';
      letter.textContent = String.fromCharCode(65 + answerIndex);
      const text = document.createElement('span');
      text.textContent = answer;
      const arrow = document.createElement('span');
      arrow.className='quiz-choice-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='↗';
      button.append(letter,text,arrow);
      button.addEventListener('click', () => {
        quizAnswers.push(answerIndex);
        saveQuiz();
        renderQuiz();
      });
      quizChoices.append(button);
    });
  }
  quizBack.addEventListener('click', () => {
    if (quizAnswers.length > 0) { quizAnswers.pop();saveQuiz();renderQuiz(); }
  });
  quizRetake.addEventListener('click', () => { quizAnswers = [];saveQuiz();renderQuiz(); quizQuestion.focus?.(); });
  quizVote.addEventListener('click', () => { if (quizMatch) chooseFish(quizMatch); });
  quizShare.addEventListener('click', async () => {
    if (!quizMatch) return;
    const profile = fishProfiles[quizMatch];
    const url = location.protocol.startsWith('http') ? new URL('#quiz',location.href).href : 'https://luminous-eclair-a2730e.netlify.app/#quiz';
    const text = `I got ${profile.title} in the Miss Fish Amsterdam personality quiz! Which canal fish are you?`;
    try {
      if (navigator.share) {
        await navigator.share({title:'Which Miss Fish are you?',text,url});
        quizShareStatus.textContent = 'Ready to share!';
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        quizShareStatus.textContent = 'Your result and quiz link were copied!';
      } else {
        quizShareStatus.textContent = `Share this link: ${url}`;
      }
    } catch (e) {
      if (e.name !== 'AbortError') quizShareStatus.textContent = `You can share this link: ${url}`;
    }
  });
  renderQuiz();

  // The celebration milestones are based on actual counts only, not sample data.
  function getSessionMilestone() {
    try { return Number(sessionStorage.getItem('miss-fish-milestone-seen-v1')) || 0; } catch (_) { return 0; }
  }
  function rememberMilestone(n) {
    try { sessionStorage.setItem('miss-fish-milestone-seen-v1',String(n)); } catch (_) {}
  }

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
