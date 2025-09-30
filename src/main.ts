import './style.css';
import { initRouter, navigate } from './router';
import { loadActivities, loadTracks, loadUsers } from './store';
import { renderDatabaseView } from './views/database';
import { renderTracksView } from './views/tracks';
import { renderRecapView } from './views/recap';

declare global {
  interface Window {
    navigate: (path: string) => void;
  }
}

function createAppShell(): HTMLElement {
  const app = document.createElement('div');
  app.className = 'app-shell';

  const header = document.createElement('header');
  const title = document.createElement('h1');
  title.textContent = 'Performance Management';
  header.appendChild(title);

  const nav = document.createElement('nav');
  const links: Array<{ label: string; path: string }> = [
    { label: 'Database', path: '/' },
    { label: 'Tracks', path: '/tracks' },
    { label: 'Recap', path: '/recap' }
  ];

  links.forEach(({ label, path }) => {
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.textContent = label;
    nav.appendChild(anchor);
  });

  header.appendChild(nav);

  const main = document.createElement('main');

  app.append(header, main);
  return app;
}

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) throw new Error('Missing #app root');
  const shell = createAppShell();
  root.appendChild(shell);

  const main = shell.querySelector('main');
  if (!main) throw new Error('Missing <main> element');

  initRouter(
    {
      '/': (container) => renderDatabaseView(container),
      '/tracks': (container) => renderTracksView(container),
      '/recap': (container) => renderRecapView(container)
    },
    main
  );

  // Preload base data in the background
  void loadUsers();
  void loadActivities();
  void loadTracks(true);

  window.navigate = navigate;
}

bootstrap();