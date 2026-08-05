function initLanguage(root: HTMLElement) {
  const langKey = 'site-lang';
  type ShellLanguage = 'en' | 'zh-Hans' | 'zh-Hant';
  const languages: ShellLanguage[] = ['en', 'zh-Hans', 'zh-Hant'];
  const normalizeLang = (value: string | undefined | null): ShellLanguage | null => {
    if (value === 'en' || value === 'zh-Hans' || value === 'zh-Hant') return value;
    if (value === 'zh') return 'zh-Hans';
    return null;
  };
  const readLang = () => {
    const saved = normalizeLang(localStorage.getItem(langKey));
    if (saved) return saved;
    return normalizeLang(root.dataset.lang) || 'en';
  };

  const applyLang = (lang: ShellLanguage) => {
    root.dataset.lang = lang;
    root.lang = lang === 'zh-Hans' ? 'zh-CN' : lang === 'zh-Hant' ? 'zh-HK' : 'en';
    localStorage.setItem(langKey, lang);
    document.querySelectorAll<HTMLElement>('[data-lang-value]').forEach((node) => {
      const isActive = node.dataset.langValue === lang;
      node.classList.toggle('active', isActive);
    });
  };

  applyLang(readLang());
  return {
    applyLang,
    nextLang() {
      const current = normalizeLang(root.dataset.lang) || 'en';
      return languages[(languages.indexOf(current) + 1) % languages.length];
    },
  };
}

function initTheme(root: HTMLElement) {
  const themeKey = 'site-theme';
  const readTheme = () => {
    const saved = localStorage.getItem(themeKey);
    if (saved === 'dark' || saved === 'light') return saved;
    if (root.dataset.theme === 'dark' || root.dataset.theme === 'light') return root.dataset.theme;
    return 'light';
  };

  const applyTheme = (theme: 'light' | 'dark') => {
    root.dataset.theme = theme;
    localStorage.setItem(themeKey, theme);
    document.querySelectorAll<HTMLElement>('[data-theme-value]').forEach((node) => {
      const isActive = node.dataset.themeValue === theme;
      node.classList.toggle('active', isActive);
    });
  };

  applyTheme(readTheme());
  return applyTheme;
}

function initShellLayout(root: HTMLElement) {
  const desktopBuffer = 100;

  const setShellLayout = (layout: 'desktop' | 'mobile') => {
    root.dataset.shellLayout = layout;
    root.classList.toggle('topbar-collapsed', layout === 'mobile');
  };

  const shouldUseDesktopLayout = () => {
    const brand = document.querySelector('.brand');
    const nav = document.querySelector('.nav-desktop');
    const actions = document.querySelector('.topbar-actions');
    if (!(brand instanceof HTMLElement) || !(nav instanceof HTMLElement) || !(actions instanceof HTMLElement)) {
      return false;
    }

    const brandRect = brand.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const navLinks = Array.from(nav.querySelectorAll<HTMLElement>('.nav-link'));
    const firstLink = navLinks.at(0);
    const lastLink = navLinks.at(-1);
    const navContentLeft = firstLink?.getBoundingClientRect().left ?? nav.getBoundingClientRect().left;
    const navContentRight = lastLink?.getBoundingClientRect().right ?? nav.getBoundingClientRect().right;
    const leftGap = navContentLeft - brandRect.right;
    const rightGap = actionsRect.left - navContentRight;
    const overlapped = navContentLeft < brandRect.right || navContentRight > actionsRect.left;

    return !overlapped && leftGap >= desktopBuffer && rightGap >= desktopBuffer;
  };

  const setMenuOpen = (open: boolean) => {
    if (root.dataset.shellLayout !== 'mobile') open = false;
    root.classList.toggle('menu-open', open);
    document.querySelectorAll<HTMLElement>('[data-toggle-menu]').forEach((button) => {
      button.setAttribute('aria-expanded', String(open));
    });
    const drawer = document.getElementById('mobile-drawer');
    if (drawer) {
      drawer.setAttribute('aria-hidden', String(!open));
      if (open) drawer.removeAttribute('inert');
      else drawer.setAttribute('inert', '');
    }
  };

  const refreshShellLayout = () => {
    setShellLayout('desktop');
    if (shouldUseDesktopLayout()) {
      setShellLayout('desktop');
      setMenuOpen(false);
      return;
    }

    setShellLayout('mobile');
    setMenuOpen(false);
  };

  return { refreshShellLayout, setMenuOpen };
}

type CopyButtonState = 'idle' | 'success' | 'error';
type SiteLanguage = 'en' | 'zh-Hans' | 'zh-Hant';

const copyButtonLabels: Record<SiteLanguage, Record<CopyButtonState, string>> = {
  en: {
    idle: 'Copy code',
    success: 'Copied',
    error: 'Copy failed',
  },
  'zh-Hans': {
    idle: '复制代码',
    success: '已复制',
    error: '复制失败',
  },
  'zh-Hant': {
    idle: '複製程式碼',
    success: '已複製',
    error: '複製失敗',
  },
};

function getSiteLanguage(): SiteLanguage {
  const lang = document.documentElement.dataset.lang;
  if (lang === 'zh-Hans' || lang === 'zh-Hant') return lang;
  return 'en';
}

function setCopyButtonState(button: HTMLButtonElement, state: CopyButtonState) {
  const label = copyButtonLabels[getSiteLanguage()][state];
  button.dataset.copyState = state;
  button.textContent = label;
  button.setAttribute('aria-label', label);
  button.title = label;
}

function syncCopyButtonLabels() {
  document.querySelectorAll<HTMLButtonElement>('.code-copy-button').forEach((button) => {
    const currentState = button.dataset.copyState;
    const state: CopyButtonState = currentState === 'success' || currentState === 'error' ? currentState : 'idle';
    setCopyButtonState(button, state);
  });
}

async function copyCodeText(text: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API unavailable');
  }

  await navigator.clipboard.writeText(text);
}

function initCodeCopyButtons() {
  const copyResetTimers = new WeakMap<HTMLButtonElement, number>();
  const codeBlocks = document.querySelectorAll<HTMLElement>('.article-prose pre > code, .about-prose pre > code');

  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    const parent = pre?.parentElement;

    if (!(pre instanceof HTMLElement) || !(parent instanceof HTMLElement) || pre.dataset.copyCodeReady === 'true') {
      return;
    }

    pre.dataset.copyCodeReady = 'true';
    pre.classList.add('code-copy-ready');

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-shell';
    parent.insertBefore(wrapper, pre);
    wrapper.append(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-button';
    setCopyButtonState(button, 'idle');

    button.addEventListener('click', async () => {
      const activeReset = copyResetTimers.get(button);
      if (activeReset) window.clearTimeout(activeReset);

      try {
        await copyCodeText(code.textContent ?? '');
        setCopyButtonState(button, 'success');
      } catch {
        setCopyButtonState(button, 'error');
      }

      const resetTimer = window.setTimeout(() => {
        setCopyButtonState(button, 'idle');
        copyResetTimers.delete(button);
      }, 1800);

      copyResetTimers.set(button, resetTimer);
    });

    wrapper.append(button);
  });
}

export function initSiteShell() {
  const root = document.documentElement;
  const { applyLang, nextLang } = initLanguage(root);
  const applyTheme = initTheme(root);
  const { refreshShellLayout, setMenuOpen } = initShellLayout(root);
  const topbar = document.querySelector<HTMLElement>('.topbar');
  let lastScrollY = window.scrollY;
  let ticking = false;

  const syncTopbarHeight = () => {
    if (!topbar) return;
    root.style.setProperty('--topbar-height', `${Math.ceil(topbar.offsetHeight)}px`);
  };

  const applyTopbarVisibility = () => {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;
    const atTop = currentY <= 4;
    const menuOpen = root.classList.contains('menu-open');
    const hideAfter = 56;
    const directionThreshold = 2;

    if (atTop || menuOpen) {
      root.classList.remove('topbar-hidden');
    } else if (delta > directionThreshold && currentY > hideAfter) {
      root.classList.add('topbar-hidden');
    } else if (delta < -directionThreshold) {
      root.classList.remove('topbar-hidden');
    }

    lastScrollY = currentY;
    ticking = false;
  };

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('[data-toggle-lang]')) {
      applyLang(nextLang());
      syncCopyButtonLabels();
      requestAnimationFrame(refreshShellLayout);
      return;
    }

    if (target.closest('[data-toggle-theme]')) {
      const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
      return;
    }

    if (target.closest('[data-toggle-menu]')) {
      setMenuOpen(!root.classList.contains('menu-open'));
      return;
    }

    if (target.closest('[data-close-menu], [data-menu-backdrop], .mobile-nav-link')) {
      setMenuOpen(false);
      return;
    }

    if (root.classList.contains('menu-open') && !target.closest('#mobile-drawer')) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenuOpen(false);
    }
  });

  let raf = 0;
  const scheduleRefresh = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      refreshShellLayout();
      syncTopbarHeight();
      raf = 0;
    });
  };

  window.addEventListener('resize', scheduleRefresh);
  window.addEventListener('orientationchange', scheduleRefresh);
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyTopbarVisibility);
  }, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleRefresh).catch(() => {});
  }
  if (topbar && 'ResizeObserver' in window) {
    const observer = new ResizeObserver(() => syncTopbarHeight());
    observer.observe(topbar);
  }

  refreshShellLayout();
  syncTopbarHeight();
  applyTopbarVisibility();
  initCodeCopyButtons();
}
