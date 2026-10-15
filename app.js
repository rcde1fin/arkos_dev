(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = window.jQuery;

  /* ---------- Currency ---------- */
  // TODO: Change text (fallback exchange rates relative to USD — used only if live rates can't load)
  const CURRENCIES = {
    PHP: { locale: 'en-PH' },
    USD: { locale: 'en-US' },
    EUR: { locale: 'de-DE' },
    GBP: { locale: 'en-GB' },
    AED: { locale: 'en-AE' },
    INR: { locale: 'en-IN' }
  };
  const RATES = { PHP: 58.5, USD: 1, EUR: 0.92, GBP: 0.79, AED: 3.67, INR: 83.2 };
  const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
  const RATES_KEY = 'arkos-rates';
  const select = $('#currency-select');
  let currency = localStorage.getItem('arkos-currency');
  // TODO: Change text (default currency)
  if (!CURRENCIES[currency]) currency = 'PHP';
  select.val(currency);

  const rateNote = $('#rates-note');
  const showRateTime = ts => {
    if (!ts) return;
    const label = 'Rates updated ' + new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    rateNote.text(label).removeAttr('hidden');
  };

  // Restore cached live rates (at most one day old)
  try {
    const saved = JSON.parse(localStorage.getItem(RATES_KEY));
    if (saved && saved.rates && Date.now() - saved.t < 24 * 60 * 60 * 1000) {
      Object.assign(RATES, saved.rates);
      showRateTime(saved.t);
    }
  } catch (e) {}

  const fmt = (usd, compact) => {
    const c = CURRENCIES[currency];
    return new Intl.NumberFormat(c.locale, {
      style: 'currency', currency, maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard'
    }).format(usd * (RATES[currency] || 1));
  };

  // Fetch today's rates; refreshes at most once per day (cached), silently falls back to RATES offline
  async function refreshRates() {
    try {
      const data = await $.getJSON(RATES_URL);
      if (data.result !== 'success' || !data.rates) return;
      const next = {};
      for (const code of Object.keys(CURRENCIES)) {
        const r = data.rates[code];
        if (typeof r !== 'number') return;
        next[code] = r;
      }
      Object.assign(RATES, next);
      localStorage.setItem(RATES_KEY, JSON.stringify({ t: Date.now(), rates: next }));
      showRateTime(data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now());
      renderPrices();
    } catch (e) {}
  }

  const renderPrices = () => {
    $('[data-price]').each(function () { $(this).text(fmt(+$(this).data('price'))); });
    $('.currency-code').text(currency);
    updateEstimate();
    updateBudget();
  };

  select.on('change', function () {
    currency = this.value;
    localStorage.setItem('arkos-currency', currency);
    renderPrices();
  });

  /* ---------- Estimator ---------- */
  const estType = $('#est-type');
  const estArea = $('#est-area');
  const estAreaOut = $('#est-area-out');
  const estValue = $('#est-value');
  function updateEstimate() {
    const rate = +estType.find(':selected').data('rate');
    const area = +estArea.val();
    const finish = +($('input[name="finish"]:checked').val() || 1);
    const base = rate * area * finish;
    estAreaOut.text(area.toLocaleString('en-US'));
    estValue.text(`${fmt(base * 0.9, true)} – ${fmt(base * 1.15, true)}`);
  }
  $('#est-type, #est-area, input[name="finish"]').on('input change', updateEstimate);

  /* ---------- Budget dual range ---------- */
  const bMin = $('#budget-min');
  const bMax = $('#budget-max');
  const bOut = $('#budget-out');
  const bFill = $('.dual-fill');
  function updateBudget(e) {
    let lo = +bMin.val(), hi = +bMax.val();
    const step = +bMin.attr('step');
    if (lo > hi - step) {
      if (e && e.target === bMin[0]) { lo = hi - step; bMin.val(lo); }
      else { hi = lo + step; bMax.val(hi); }
    }
    const min = +bMin.attr('min'), span = +bMin.attr('max') - min;
    bFill.css({ left: `${((lo - min) / span) * 100}%`, right: `${100 - ((hi - min) / span) * 100}%` });
    const txt = `${fmt(lo, true)} – ${fmt(hi, true)}`;
    bOut.text(txt);
    bMin.attr('aria-valuetext', fmt(lo));
    bMax.attr('aria-valuetext', fmt(hi));
    return txt;
  }
  $('#budget-min, #budget-max').on('input', updateBudget);

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const header = $('.site-header');
  const nav = $('#main-nav');
  const toggle = $('.menu-toggle');

  const closeMenu = () => {
    nav.removeClass('open');
    toggle.attr('aria-expanded', 'false');
    toggle.find('.sr-only').text('Open menu');
    $(document.body).css('overflow', '');
    if (lenis) lenis.start();
  };
  toggle.on('click', () => {
    const open = toggle.attr('aria-expanded') !== 'true';
    nav.toggleClass('open', open);
    toggle.attr('aria-expanded', String(open));
    toggle.find('.sr-only').text(open ? 'Close menu' : 'Open menu');
    $(document.body).css('overflow', open ? 'hidden' : '');
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) nav.find('a').first().trigger('focus');
  });
  $(document).on('keydown', e => {
    if (e.key === 'Escape' && nav.hasClass('open')) { closeMenu(); toggle.trigger('focus'); }
  });

  $('a[href^="#"]').on('click', function (e) {
    const id = $(this).attr('href');
    const target = id.length > 1 ? $(id) : $();
    if (!target.length) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target[0], { offset: id === '#home' ? 0 : -70 });
    else target[0].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    const focusEl = target.find('h1, h2').first();
    (focusEl.length ? focusEl : target).attr('tabindex', '-1').trigger('focus');
    history.replaceState(null, '', id);
  });

  /* ---------- Header state, parallax, process progress ---------- */
  let lastY = 0;
  const parallaxEls = $('[data-parallax]').toArray();
  const steps = $('.steps');
  const stepItems = $('.step');
  const onScroll = () => {
    const y = window.scrollY;
    header.toggleClass('scrolled', y > 40);
    header.toggleClass('hide', y > 500 && y > lastY && !nav.hasClass('open'));
    lastY = y;
    if (!reduceMotion) {
      parallaxEls.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const off = (r.top + r.height / 2 - innerHeight / 2) * +el.dataset.parallax;
        el.style.transform = `translate3d(0, ${-off}px, 0) scale(1.12)`;
      });
    }
    const sr = steps[0].getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - sr.top) / sr.height));
    steps.css('--p', p.toFixed(3));
    stepItems.each(function () {
      $(this).toggleClass('active', this.getBoundingClientRect().top < innerHeight * 0.6);
    });
  };
  let ticking = false;
  $(window).on('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  });
  onScroll();

  /* ---------- Active nav ---------- */
  const navLinks = $('.main-nav a');
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.each(function () {
        $(this).attr('aria-current', String($(this).attr('href') === `#${en.target.id}`));
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $('main section[id]').each(function () { sectionObs.observe(this); });

  /* ---------- Reveal + counters ---------- */
  const countUp = el => {
    const end = +el.dataset.count, dec = +(el.dataset.decimals || 0);
    if (reduceMotion) return;
    const t0 = performance.now(), dur = 1600;
    const tick = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (end * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      $(en.target).addClass('in');
      $(en.target).find('[data-count]').each(function () { countUp(this); });
      revealObs.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $('.reveal').each(function () { revealObs.observe(this); });

  /* ---------- Hero 3D tilt ---------- */
  const tilt = $('[data-tilt]')[0];
  if (tilt && !reduceMotion && matchMedia('(hover: hover)').matches) {
    const frame = $('.hero-frame', tilt)[0] || tilt.querySelector('.hero-frame');
    tilt.addEventListener('pointermove', e => {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    tilt.addEventListener('pointerleave', () => { frame.style.transform = ''; });
  }

  /* ---------- Portfolio filter (FLIP) ---------- */
  const projects = $('.project').toArray();
  const status = $('#filter-status');
  $('.filter-btn').on('click', function () {
    const f = $(this).data('filter');
    $('.filter-btn').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    const first = new Map(projects.map(p => [p, p.getBoundingClientRect()]));
    projects.forEach(p => { p.hidden = !(f === 'all' || p.dataset.category === f); });
    const shown = projects.filter(p => !p.hidden);
    status.textContent = `Showing ${shown.length} ${f === 'all' ? '' : f + ' '}projects`;
    if (reduceMotion) return;
    shown.forEach((p, i) => {
      const a = first.get(p), b = p.getBoundingClientRect();
      if (a.width === 0) {
        p.animate([{ opacity: 0, transform: 'scale(.85) translateY(30px)' }, { opacity: 1, transform: 'none' }],
          { duration: 700, delay: i * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      } else {
        p.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`, transformOrigin: 'top left' },
          { transform: 'none', transformOrigin: 'top left' }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  });

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lb-img');
  let current = 0, opener = null;
  const visible = () => projects.filter(p => !p.hidden);
  const show = i => {
    const list = visible();
    current = (i + list.length) % list.length;
    const p = list[current], img = $(p).find('img')[0];
    lbImg.attr('src', img.srcset.split(',').pop().trim().split(' ')[0]);
    lbImg.attr('alt', img.alt);
    $('#lb-title').text(p.dataset.title);
    $('#lb-meta').text(p.dataset.meta);
  };
  projects.forEach(p => $(p).find('.project-btn').on('click', e => {
    opener = e.currentTarget;
    show(visible().indexOf(p));
    lb[0].showModal();
    if (lenis) lenis.stop();
  }));
  $('#lb-prev').on('click', () => show(current - 1));
  $('#lb-next').on('click', () => show(current + 1));
  $('#lb-close').on('click', () => lb[0].close());
  lb.on('click', e => { if (e.target === lb[0]) lb[0].close(); });
  lb.on('keydown', e => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  lb.on('close', () => { if (lenis) lenis.start(); if (opener) $(opener).trigger('focus'); });

  /* ---------- Contact (mailto) ---------- */
  // TODO: Change text (email address that receives enquiries)
  const CONTACT_EMAIL = 'hello@example.com';
  const form = $('#contact-form');
  const formStatus = $('#form-status');
  const setErr = (input, msg) => {
    input.attr('aria-invalid', String(!!msg));
    $(`#${input.attr('id')}-err`).text(msg);
  };
  form.on('submit', e => {
    e.preventDefault();
    const name = $('#cf-name'), email = $('#cf-email'), msg = $('#cf-msg');
    setErr(name, name.val().trim() ? '' : 'Please enter your name.');
    setErr(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.val().trim()) ? '' : 'Please enter a valid email address.');
    setErr(msg, msg.val().trim() ? '' : 'Please tell us a little about your project.');
    const invalid = form.find('[aria-invalid="true"]').first();
    if (invalid.length) { invalid.trigger('focus'); formStatus.removeClass('ok').text('Please fix the highlighted fields.'); return; }
    const body = [
      `Name: ${name.val().trim()}`,
      `Email: ${email.val().trim()}`,
      `Phone: ${$('#cf-phone').val().trim() || '-'}`,
      `Project type: ${$('#cf-type').val()}`,
      `Budget (${currency}): ${updateBudget()}`,
      '',
      msg.val().trim()
    ].join('\n');
    const subject = `Project enquiry — ${$('#cf-type').val()} — ${name.val().trim()}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    formStatus.addClass('ok').text('Opening your email app… If nothing happens, email us directly at ' + CONTACT_EMAIL + '.');
  });

  renderPrices();
  refreshRates();
})();
