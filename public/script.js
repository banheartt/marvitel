// ── Mobile menu ──
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

// ── HERO SLIDER ──
const slides = Array.from(document.querySelectorAll('.hero-slide'));
const dots = Array.from(document.querySelectorAll('#slider-dots .dot'));
let current = 0;
let timer;

function goTo(n) {
  // Remove active do slide atual
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  // Novo índice com loop
  current = (n + slides.length) % slides.length;
  // Activa novo slide e dot
  slides[current].classList.add('active');
  dots[current].classList.add('active');
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!document.hidden) goTo(current + 1);
  }, 6000);
}

// Dots navegam pelo slider
dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    goTo(i);
    startTimer(); // reinicia o timer ao clicar
  });
});

// Inicia autoplay
startTimer();

// ── SEGMENT TABS ──
const segTabs = document.querySelectorAll('.seg-tab');
const tabPanels = document.querySelectorAll('.tab-panel');

// ── Segment Dropdown Toggle & Hover ──
document.querySelectorAll('.relative.group').forEach(container => {
  const btn = container.querySelector('.seg-dropdown-btn');
  const menu = container.querySelector('.seg-dropdown-menu');
  if (!btn || !menu) return;

  // Click toggle (mainly for mobile)
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';

    // Close other menus
    document.querySelectorAll('.seg-dropdown-menu.show').forEach(m => {
      if (m !== menu) m.classList.remove('show');
    });
    document.querySelectorAll('.seg-dropdown-btn').forEach(b => {
      if (b !== btn) b.setAttribute('aria-expanded', 'false');
    });

    btn.setAttribute('aria-expanded', !isExpanded);
    menu.classList.toggle('show');
  });

  // Hover support (matches megamenu behavior on desktop)
  container.addEventListener('mouseenter', () => {
    if (window.innerWidth >= 1024) {
      btn.setAttribute('aria-expanded', 'true');
      // No need to add .show here as CSS group-hover handles visibility
    }
  });

  container.addEventListener('mouseleave', () => {
    if (window.innerWidth >= 1024) {
      btn.setAttribute('aria-expanded', 'false');
    }
  });
});

// ── Segment Dropdown Item Click ──
document.querySelectorAll('.seg-dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const seg = item.dataset.seg;
    const labelText = item.textContent.trim();
    const iconHtml = item.querySelector('svg').outerHTML;

    // Update all labels and icons in triggers
    document.querySelectorAll('.seg-current-label').forEach(el => {
      el.textContent = labelText;
    });
    document.querySelectorAll('.seg-current-icon').forEach(el => {
      el.innerHTML = iconHtml;
    });

    // Close all menus
    document.querySelectorAll('.seg-dropdown-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.seg-dropdown-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));

    // Trigger existing tab logic by finding the correct .seg-tab
    // We target the wide-screen tabs for the click trigger
    const correspondingTab = document.querySelector(`.seg-tab[data-seg="${seg}"]`);
    if (correspondingTab) {
      correspondingTab.click(); // This will trigger panel switch AND scroll
    }
  });
});

// ── Close on click outside ──
document.addEventListener('click', () => {
  document.querySelectorAll('.seg-dropdown-menu').forEach(m => m.classList.remove('show'));
  document.querySelectorAll('.seg-dropdown-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
});

segTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Skip scroll/active logic if this is a dropdown toggle button
    if (tab.classList.contains('seg-dropdown-btn')) return;

    // Remove active from ALL seg-tabs (handles dual desktop/mobile tab sets)
    document.querySelectorAll('.seg-tab.active').forEach(activeTab => {
      activeTab.classList.remove('active');
      activeTab.setAttribute('aria-selected', 'false');
    });
    const activePanel = document.querySelector('.tab-panel.active');

    if (activePanel) activePanel.classList.remove('active');

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    // Auto-scroll to content
    const targetSection = document.getElementById('section-tabs');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }

    const seg = tab.dataset.seg;
    const panel = document.getElementById('panel-' + seg);
    if (panel) {
      panel.classList.add('active');

      // Quando o segmento (Empresa/Condomínio) fica visível, agendamos o recálculo via requestAnimationFrame
      // para garantir que o CSS display:block já foi processado pelo browser
      requestAnimationFrame(() => {
        const activePlanTab = panel.querySelector('.plan-tab.active');
        if (activePlanTab && window.carouselRefreshFns) {
          const plan = activePlanTab.dataset.plan;
          if (window.carouselRefreshFns[plan]) window.carouselRefreshFns[plan]();
        }

        // Garante que o carrossel de serviços (onde existe) seja "acordado" da tela oculta
        panel.querySelectorAll('.svc-track').forEach(t => {
          if (typeof t._refresh === 'function') t._refresh();
        });
      });
    }
  });
});

// ── SERVICE CARD CAROUSEL (Empresa) — loop infinito ──
(function () {
  const track = document.getElementById('svc-track-empresa');
  const prevBtn = document.getElementById('svc-prev-empresa');
  const nextBtn = document.getElementById('svc-next-empresa');
  if (!track || !prevBtn || !nextBtn) return;

  // 1. Clonar todos os cards originais e appendar (cria "anel" duplo)
  const originals = Array.from(track.querySelectorAll('.svc-card'));
  const N = originals.length;
  originals.forEach(c => track.appendChild(c.cloneNode(true)));
  // track agora tem 2*N cards

  let current = 0; // índice lógico, pode ir além de N
  let isResetting = false;

  function perView() { return window.innerWidth >= 1024 ? 3 : 1; }

  function cardWidth() {
    const c = track.querySelectorAll('.svc-card')[0];
    return c ? c.offsetWidth + 18 : 240;
  }

  // Move o track para o índice dado, com ou sem transição
  function moveTo(index, animated) {
    track.style.transition = animated
      ? 'transform 0.42s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none';
    track.style.transform = `translateX(-${index * cardWidth()}px)`;
  }

  // Avança/recua e gerencia o reset silencioso ao cruzar os limites
  function goTo(index) {
    current = index;
    moveTo(current, true);

    // Atualiza estado visual dos botões (sempre habilitados no loop infinito)
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    prevBtn.style.opacity = '1';
    nextBtn.style.opacity = '1';
  }

  // Após a transição terminar, verifica se precisa de reset silencioso
  track.addEventListener('transitionend', () => {
    if (isResetting) return;
    if (current >= N) {
      isResetting = true;
      current -= N;
      moveTo(current, false);
      requestAnimationFrame(() => isResetting = false);
    } else if (current < 0) {
      isResetting = true;
      current += N;
      moveTo(current, false);
      requestAnimationFrame(() => isResetting = false);
    }
  });

  // ── Autoplay ──
  const INTERVAL = 3500;
  let autoTimer;

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (track && track.offsetWidth > 0 && !document.hidden) {
        goTo(current + 1);
      }
    }, INTERVAL);
  }

  prevBtn.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  nextBtn.addEventListener('click', () => { goTo(current + 1); startAuto(); });

  // Recalculate on resize
  window.addEventListener('resize', () => moveTo(current, false));

  // Init
  goTo(0);
  startAuto();
})();

// ── SERVICE CARD CAROUSEL — fábrica reutilizável ──
function makeServiceCarousel(trackId, prevId, nextId) {
  const track = document.getElementById(trackId);
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  if (!track) return;

  const originals = Array.from(track.querySelectorAll('.svc-card'));
  const N = originals.length;
  originals.forEach(c => track.appendChild(c.cloneNode(true)));

  let current = 0;
  let isResetting = false;

  function cardWidth() {
    const c = track.querySelectorAll('.svc-card')[0];
    return c ? c.offsetWidth + 18 : 240;
  }

  function moveTo(index, animated) {
    track.style.transition = animated
      ? 'transform 0.42s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none';
    track.style.transform = `translateX(-${index * cardWidth()}px)`;
  }

  function goTo(index) {
    current = index;
    moveTo(current, true);
    if (prevBtn) {
      prevBtn.disabled = false;
      prevBtn.style.opacity = '1';
    }
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.style.opacity = '1';
    }
  }

  track.addEventListener('transitionend', () => {
    if (isResetting) return;
    if (current >= N) {
      isResetting = true;
      current -= N;
      moveTo(current, false);
      requestAnimationFrame(() => isResetting = false);
    } else if (current < 0) {
      isResetting = true;
      current += N;
      moveTo(current, false);
      requestAnimationFrame(() => isResetting = false);
    }
  });

  const INTERVAL = 3500;
  let autoTimer;
  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (track && track.offsetWidth > 0 && !document.hidden) {
        goTo(current + 1);
      }
    }, INTERVAL);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(current + 1); startAuto(); });

  window.addEventListener('resize', () => moveTo(current, false));

  track._refresh = () => {
    moveTo(current, false);
  };

  goTo(0);
  startAuto();
}

makeServiceCarousel('svc-track-condominio', 'svc-prev-condominio', 'svc-next-condominio');
makeServiceCarousel('svc-track-evento', 'svc-prev-evento', 'svc-next-evento');

// ── GALLERY CAROUSEL (Evento) ──
(function initGalleryCarousel() {
  const track = document.getElementById('gallery-track-evento');
  const prevBtn = document.getElementById('gallery-prev-evento');
  const nextBtn = document.getElementById('gallery-next-evento');
  const dotsContainer = document.getElementById('gallery-dots-evento');
  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.gallery-slide'));
  const total = slides.length;
  let current = 0;

  function getItemsPerView() {
    return window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
  }

  function updateCarousel() {
    const perView = getItemsPerView();
    const maxIndex = Math.max(0, total - perView);
    if (current > maxIndex) current = maxIndex;
    if (current < 0) current = 0;

    const gap = 16; // gap-4 is 1rem = 16px
    const slideW = slides[0].offsetWidth;
    track.style.transform = `translateX(-${current * (slideW + gap)}px)`;

    if (dotsContainer) {
      Array.from(dotsContainer.children).forEach((dot, i) => {
        if (i === current) {
          dot.className = 'h-2 w-6 bg-azul-tradicao rounded-full transition-all duration-300';
        } else {
          dot.className = 'h-2 w-2 bg-gray-300 rounded-full transition-all duration-300';
        }
      });
    }
  }

  function renderDots() {
    if (!dotsContainer) return;
    const perView = getItemsPerView();
    const maxIndex = Math.max(0, total - perView);
    dotsContainer.innerHTML = '';
    for (let i = 0; i <= maxIndex; i++) {
        const dot = document.createElement('button');
        dot.className = i === current ? 'h-2 w-6 bg-azul-tradicao rounded-full transition-all duration-300' : 'h-2 w-2 bg-gray-300 rounded-full transition-all duration-300';
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', () => { current = i; updateCarousel(); startAuto(); });
        dotsContainer.appendChild(dot);
    }
  }

  let autoTimer;
  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (track && track.offsetWidth > 0 && !document.hidden) {
        const maxIndex = Math.max(0, total - getItemsPerView());
        current = current >= maxIndex ? 0 : current + 1;
        updateCarousel();
      }
    }, 4000);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { 
      const maxIndex = Math.max(0, total - getItemsPerView());
      current = current <= 0 ? maxIndex : current - 1; 
      updateCarousel(); startAuto(); 
  });
  if (nextBtn) nextBtn.addEventListener('click', () => { 
      const maxIndex = Math.max(0, total - getItemsPerView());
      current = current >= maxIndex ? 0 : current + 1; 
      updateCarousel(); startAuto(); 
  });

  window.addEventListener('resize', () => {
    current = 0; 
    renderDots();
    updateCarousel();
  });

  renderDots();
  updateCarousel();
  startAuto();
})();
// ── PLAN TABS ──
const carouselRefreshFns = {};
window.carouselRefreshFns = carouselRefreshFns;

document.querySelectorAll('.plan-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const parentSegment = tab.closest('.tab-panel');
    if (!parentSegment) return;

    parentSegment.querySelectorAll('.plan-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    parentSegment.querySelectorAll('.plan-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const plan = tab.dataset.plan;
    const targetPanel = document.getElementById('plan-panel-' + plan);
    if (targetPanel) targetPanel.classList.add('active');

    if (window.carouselRefreshFns[plan]) window.carouselRefreshFns[plan]();
  });
});

// ── PLAN CARDS CAROUSEL (mobile/tablet) ──
(function initPlanCarousels() {
  const configs = [
    { trackId: 'plan-track-internet', dotsId: 'plan-dots-internet', planKey: 'internet' },
    { trackId: 'plan-track-adicionais', dotsId: 'plan-dots-adicionais', planKey: 'adicionais' },
    { trackId: 'plan-track-internet-condominio', dotsId: 'plan-dots-internet-condominio', planKey: 'internet-condominio' },
    { trackId: 'plan-track-banda-larga-condominio', dotsId: 'plan-dots-banda-larga-condominio', planKey: 'banda-larga-condominio' },
    { trackId: 'plan-track-adicionais-condominio', dotsId: 'plan-dots-adicionais-condominio', planKey: 'adicionais-condominio' },
    { trackId: 'plan-track-tv-condominio', dotsId: 'plan-dots-tv-condominio', planKey: 'tv-condominio' },
    { trackId: 'plan-track-internet-evento', dotsId: 'plan-dots-internet-evento', planKey: 'internet-evento' },
    { trackId: 'plan-track-adicionais-evento', dotsId: 'plan-dots-adicionais-evento', planKey: 'adicionais-evento' },
    { trackId: 'plan-track-tv-evento', dotsId: 'plan-dots-tv-evento', planKey: 'tv-evento' },
  ];

  configs.forEach(({ trackId, dotsId, planKey }) => {
    const track = document.getElementById(trackId);
    if (!track) return;

    const outer = track.closest('.plan-carousel-outer');
    const dotsContainer = dotsId ? document.getElementById(dotsId) : null;
    const cards = Array.from(track.querySelectorAll('.plan-card'));
    const total = cards.length;
    let current = 0;
    let startX = 0;
    let isDragging = false;

    function getSlideWidth() {
      const s = getComputedStyle(outer);
      let w = outer.clientWidth
        - parseFloat(s.paddingLeft || 0)
        - parseFloat(s.paddingRight || 0);
      if (w <= 0) {
        let el = outer.parentElement;
        while (el && el.clientWidth === 0) el = el.parentElement;
        if (el) w = el.clientWidth - parseFloat(s.paddingLeft || 0) - parseFloat(s.paddingRight || 0);
      }
      return Math.max(w, 1);
    }

    function setCardWidths() {
      const w = getSlideWidth();
      cards.forEach(card => {
        card.style.width = w + 'px';
        card.style.minWidth = w + 'px';
        card.style.flexShrink = '0';
      });
    }

    function updateDots() {
      if (!dotsContainer) return;
      Array.from(dotsContainer.children).forEach((dot, i) => {
        dot.className = i === current ? 'plan-dot plan-dot-active' : 'plan-dot';
      });
    }

    function renderDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('button');
        dot.className = i === 0 ? 'plan-dot plan-dot-active' : 'plan-dot';
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', () => { goTo(i); });
        dotsContainer.appendChild(dot);
      }
    }

    function goTo(idx) {
      if (idx < 0) current = total - 1;
      else if (idx >= total) current = 0;
      else current = idx;
      
      const w = getSlideWidth();
      track.style.transform = 'translateX(-' + (current * w) + 'px)';
      updateDots();
    }

    function refresh() {
      setCardWidths();
      goTo(current);
    }

    carouselRefreshFns[planKey] = refresh;

    document.querySelectorAll('.plan-carousel-btn[data-carousel="' + trackId + '"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('prev')) goTo(current - 1);
        else goTo(current + 1);
      });
    });

    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; }, { passive: true });
    track.addEventListener('touchend', e => {
      if (!isDragging) return;
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
      isDragging = false;
    });

    window.addEventListener('resize', () => {
      setCardWidths();
      goTo(current);
    });

    setCardWidths();
    renderDots();
    goTo(0);
  });
})();

// ── BACK TO TOP ──
const backToTop = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 300);
});
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── COOKIE NOTICE ──
(function initCookieNotice() {
  if (localStorage.getItem('cookieAccepted')) return;

  const cookieBar = document.createElement('div');
  cookieBar.className = 'cookie-notice-bar';
  cookieBar.innerHTML = `
    <div class="cookie-notice-content">
      <p>Utilizamos cookies para melhorar sua experiência. Ao continuar, você aceita nossa <a href="/public/politica-privacidade.html">Política de Privacidade</a>.</p>
      <button id="accept-cookies-btn" class="cookie-notice-btn">Entendi e concordo</button>
    </div>
  `;

  document.body.appendChild(cookieBar);

  document.getElementById('accept-cookies-btn').addEventListener('click', () => {
    localStorage.setItem('cookieAccepted', 'true');
    cookieBar.classList.add('hide');
    setTimeout(() => cookieBar.remove(), 300);
  });
})();

// ── HASH NAVIGATION (Condomínios) ──
function checkHashAndNavigate() {
  if (window.location.hash === '#condominios') {
    const tabCondominio = document.querySelector('.seg-tab[data-seg="condominio"]');
    if (tabCondominio) {
      setTimeout(() => {
        // Ignora a animação e força o scroll da tab
        tabCondominio.click();
      }, 150);
    }
  }
}

window.addEventListener('load', checkHashAndNavigate);
window.addEventListener('hashchange', checkHashAndNavigate);
