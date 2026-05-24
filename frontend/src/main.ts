import "./style.css";
import { initRouter, navigate } from "./router";
import { loadActivities, loadTracks, loadUsers } from "./store";
import { el } from "./ui/dom";
import { renderDatabaseView } from "./views/database";
import { renderRecapView } from "./views/recap";
import { renderTracksView } from "./views/tracks";

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
  const app = el("div", { className: "min-h-full flex flex-col" });

  const header = el("header", { className: "bg-surface border-b border-ring" });
  const headerContent = el("div", {
    className:
      "max-w-[1100px] mx-auto p-6 flex flex-wrap items-center justify-between gap-4",
  });

  const titleBlock = el("div");
  titleBlock.append(
    el("h1", {
      className: "text-[28px] font-bold",
      textContent: "Performance Management",
    }),
    el("p", {
      className: "mt-1 text-muted text-[15px]",
      textContent: "Monitor my daily activities",
    }),
  );

  const nav = el("nav", { className: "flex flex-wrap gap-2" });
  const links: Array<{ label: string; path: string; icon: string }> = [
    { label: "Database", path: "/", icon: "📇" },
    { label: "Tracks", path: "/tracks", icon: "📝" },
    { label: "Recap", path: "/recap", icon: "📊" },
  ];

  const navLinkClasses =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-transparent " +
    "text-muted-strong font-medium no-underline transition-colors duration-150 " +
    "hover:bg-[rgba(37,99,235,0.08)] hover:text-primary " +
    "aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary-dark";

  links.forEach(({ label, path, icon }) => {
    const anchor = el("a", {
      className: navLinkClasses,
      attrs: { href: path },
    });
    const iconSpan = el("span", { className: "text-base", textContent: icon });
    anchor.append(iconSpan, document.createTextNode(label));
    nav.append(anchor);
  });

  headerContent.append(titleBlock, nav);
  header.append(headerContent);

  const main = el("main", { className: "flex-1 py-8" });
  const mainContainer = el("div", {
    className: "max-w-[1100px] mx-auto p-6 flex flex-col gap-8",
  });
  main.append(mainContainer);

  app.append(header, main);

  return { root: app, outlet: mainContainer };
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
