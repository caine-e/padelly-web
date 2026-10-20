import { newScore, addPoint, pointLabels } from './scoring-demo.js?v=20261020d';

// Content and chapter links work independently of these enhancements.
const hero = document.querySelector('.sport-hero');
if (hero) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frameId = 0;
  let current = 0;
  let target = 0;
  function frame() {
    current += (target - current) * 0.085;
    hero.style.setProperty('--sport-shift', current.toFixed(2) + 'px');
    hero.style.setProperty('--scene-shift', (current * 0.25).toFixed(2) + 'px');
    frameId = Math.abs(target - current) > 0.1 ? requestAnimationFrame(frame) : 0;
  }
  function update() {
    if (reduced.matches) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      current = target = 0;
      hero.style.removeProperty('--sport-shift');
      hero.style.removeProperty('--scene-shift');
      return;
    }
    const bounds = hero.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight) return;
    target = Math.max(-35, Math.min(35, -bounds.top * 0.075));
    if (!frameId) frameId = requestAnimationFrame(frame);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  reduced.addEventListener('change', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      hero.dataset.inView = String(entries[0].isIntersecting);
    }).observe(hero);
  }
  update();
}

const demo = document.querySelector('[data-scoring-demo]');
if (demo) {
  let score = newScore();
  const history = [];
  const output = demo.querySelector('[data-demo-score]');
  const status = demo.querySelector('[data-demo-status]');
  const undo = demo.querySelector('[data-demo-undo]');
  const reset = demo.querySelector('[data-demo-reset]');
  function render() {
    const label = pointLabels(score).join(' : ');
    output.textContent = label;
    output.setAttribute('aria-label', demo.dataset.scoreLabel + ': ' + label);
    const games = demo.dataset.gamesLabel + ': ' + score.games.join(' : ');
    if (status.textContent !== games) status.textContent = games;
    undo.disabled = history.length === 0;
    reset.disabled = history.length === 0;
  }
  demo.querySelectorAll('[data-score-team]').forEach(button => {
    button.addEventListener('click', () => {
      history.push(score);
      score = addPoint(score, Number(button.dataset.scoreTeam));
      render();
    });
  });
  undo.addEventListener('click', () => {
    if (!history.length) return;
    score = history.pop();
    render();
  });
  reset.addEventListener('click', () => {
    history.length = 0;
    score = newScore();
    render();
  });
  render();
  demo.hidden = false;
}
