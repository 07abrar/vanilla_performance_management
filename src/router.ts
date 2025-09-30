export type ViewRenderer = (container: HTMLElement) => void | (() => void);

interface RouteConfig {
  [path: string]: ViewRenderer;
}

let currentCleanup: (() => void) | null = null;
let currentPath = '/';
let routes: RouteConfig = {};
let outlet: HTMLElement | null = null;

function renderPath(path: string): void {
  const normalized = routes[path] ? path : '/';
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  currentPath = normalized;
  const renderer = routes[normalized];
  if (renderer && outlet) {
    const cleanup = renderer(outlet);
    if (typeof cleanup === 'function') {
      currentCleanup = cleanup;
    }
  }
  updateActiveLinks();
}

function onPopState(): void {
  renderPath(window.location.pathname);
}

function onLinkClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (!target) return;
  const anchor = target.closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('#')) return;
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
  event.preventDefault();
  navigate(href);
}

function updateActiveLinks(): void {
  document.querySelectorAll('nav a').forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    link.classList.toggle('active', link.pathname === currentPath);
  });
}

export function initRouter(config: RouteConfig, container: HTMLElement): void {
  routes = config;
  outlet = container;
  window.addEventListener('popstate', onPopState);
  document.addEventListener('click', onLinkClick);
  renderPath(window.location.pathname);
}

export function navigate(path: string): void {
  if (path === currentPath) return;
  history.pushState({}, '', path);
  renderPath(path);
}

export function destroyRouter(): void {
  window.removeEventListener('popstate', onPopState);
  document.removeEventListener('click', onLinkClick);
  if (currentCleanup) currentCleanup();
  routes = {};
  outlet = null;
}