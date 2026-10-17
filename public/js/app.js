/**
 * 3DWorld Application Interactions
 * Apple-style navbar blur, explore dropdown, search modal, card micro-interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Apple-style Navbar Scroll Behavior
  const nav = document.getElementById('site-nav');
  const handleNavScroll = () => {
    if (window.scrollY > 30) {
      nav.classList.add('nav-scrolled');
    } else {
      nav.classList.remove('nav-scrolled');
    }
  };
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // 2. Dropdown Menu for "Explore"
  const exploreTrigger = document.getElementById('nav-explore-trigger');
  const exploreDropdown = document.getElementById('nav-explore-dropdown');
  if (exploreTrigger && exploreDropdown) {
    let timeout;
    const show = () => {
      clearTimeout(timeout);
      exploreDropdown.classList.add('open');
      exploreTrigger.setAttribute('aria-expanded', 'true');
    };
    const hide = () => {
      timeout = setTimeout(() => {
        exploreDropdown.classList.remove('open');
        exploreTrigger.setAttribute('aria-expanded', 'false');
      }, 150);
    };

    exploreTrigger.addEventListener('mouseenter', show);
    exploreTrigger.addEventListener('mouseleave', hide);
    exploreDropdown.addEventListener('mouseenter', show);
    exploreDropdown.addEventListener('mouseleave', hide);
    exploreTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      exploreDropdown.classList.toggle('open');
    });
  }

  // 3. Search Modal Dialog
  const searchBtn = document.getElementById('nav-search-btn');
  const searchModal = document.getElementById('search-modal');
  const searchClose = document.getElementById('search-modal-close');
  const searchInput = document.getElementById('search-modal-input');

  if (searchBtn && searchModal) {
    const openSearch = (e) => {
      e.preventDefault();
      searchModal.classList.add('active');
      setTimeout(() => searchInput && searchInput.focus(), 100);
      document.body.style.overflow = 'hidden';
    };
    const closeSearch = () => {
      searchModal.classList.remove('active');
      document.body.style.overflow = '';
    };

    searchBtn.addEventListener('click', openSearch);
    if (searchClose) searchClose.addEventListener('click', closeSearch);
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) closeSearch();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchModal.classList.contains('active')) {
        closeSearch();
      }
    });
  }

  // 4. Smooth Anchor Scrolling for on-page targets
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // 5. Printing Service Step Highlights
  const printStepCards = document.querySelectorAll('.print-step-item');
  printStepCards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
      printStepCards.forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');
    });
  });
});

