import "./styles/tailwind.css";
import { initRouter, navigate } from "app/router";
import { loadActivities, loadTracks, loadUsers } from "shared/store";
import { createAppShell } from "app/shell";
import { renderDatabaseView } from "features/database/page";
import { renderRecapView } from "features/recap/page";
import { renderTracksView } from "features/tracks/page";

declare global {
  interface Window {
    navigate: (path: string) => void;
  }
}

function bootstrap(): void {
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app root");
  const { root: shell, outlet } = createAppShell();
  root.appendChild(shell);

  initRouter(
    {
      "/": (container) => renderDatabaseView(container),
      "/tracks": (container) => renderTracksView(container),
      "/recap": (container) => renderRecapView(container),
    },
    outlet,
  );

  void loadUsers();
  void loadActivities();
  void loadTracks();

  window.navigate = navigate;
}

bootstrap();
