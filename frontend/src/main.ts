import './style.css';
import { initRouter, navigate } from './router';
import { loadActivities, loadTracks, loadUsers } from './store';
import { renderDatabaseView } from './views/database';
import { renderTracksView } from './views/tracks';
import { renderRecapView } from './views/recap';
import { el } from './ui/dom';

declare global {
  interface Window {
    navigate: (path: string) => void;
  }
}

interface AppShell {
  root: HTMLElement;
  outlet: HTMLElement;
}

function createAppShell(): AppShell {
  const app = el('div', { className: 'app-shell' });

  const header = el('header', { className: 'app-header' });
  const headerContent = el('div', { className: 'container header-content' });

  const titleBlock = el('div');
  titleBlock.append(
    el('h1', { className: 'app-title', textContent: 'Performance Management' }),
    el('p', {
      className: 'app-tagline',
      textContent: "Monitor your team's database, tracks, and recap analytics."
    })
  );

  const nav = el('nav', { className: 'nav' });
  const links: Array<{ label: string; path: string; icon: string }> = [
    { label: 'Database', path: '/', icon: '📇' },
    { label: 'Tracks', path: '/tracks', icon: '📝' },
    { label: 'Recap', path: '/recap', icon: '📊' }
  ];

  links.forEach(({ label, path, icon }) => {
    const anchor = el('a', { className: 'nav-link', attrs: { href: path } });
    const iconSpan = el('span', { className: 'nav-icon', textContent: icon });
    anchor.append(iconSpan, document.createTextNode(label));
    nav.append(anchor);
  });

  headerContent.append(titleBlock, nav);
  header.append(headerContent);

  const main = el('main', { className: 'app-main' });
  const mainContainer = el('div', { className: 'container page-container' });
  main.append(mainContainer);

  app.append(header, main);

  return { root: app, outlet: mainContainer };
}

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) throw new Error('Missing #app root');
  const { root: shell, outlet } = createAppShell();
  root.appendChild(shell);

  initRouter(
    {
      '/': (container) => renderDatabaseView(container),
      '/tracks': (container) => renderTracksView(container),
      '/recap': (container) => renderRecapView(container)
    },
    outlet
  );

  void loadUsers();
  void loadActivities();
  void loadTracks(true);

  window.navigate = navigate;
}

bootstrap();