import { el } from "shared/ui/dom";

interface AppShell {
  root: HTMLElement;
  outlet: HTMLElement;
}

export function createAppShell(): AppShell {
  const app = el("div", { className: "min-h-full flex flex-col" });

  const header = el("header", { className: "bg-surface border-b border-ring" });
  const headerContent = el("div", {
    className:
      "max-w-layout mx-auto p-6 flex flex-wrap items-center justify-between gap-4",
  });

  const titleBlock = el("div");
  titleBlock.append(
    el("h1", {
      className: "text-3xl font-bold",
      textContent: "Performance Management",
    }),
    el("p", {
      className: "mt-1 text-muted text-sm",
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
    "hover:bg-primary-hover hover:text-primary " +
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
    className: "max-w-layout mx-auto p-6 flex flex-col gap-8",
  });
  main.append(mainContainer);

  app.append(header, main);

  return { root: app, outlet: mainContainer };
}
