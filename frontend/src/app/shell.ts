import { html, render } from "lit-html";

interface AppShell {
  root: HTMLElement;
  outlet: HTMLElement;
}

const NAV_LINK =
  "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-transparent " +
  "text-muted-strong font-medium no-underline transition-colors duration-150 " +
  "hover:bg-primary-hover hover:text-primary " +
  "aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary-dark";

const links = [
  { label: "Database", path: "/", icon: "📇" },
  { label: "Tracks", path: "/tracks", icon: "📝" },
  { label: "Recap", path: "/recap", icon: "📊" },
];

export function createAppShell(): AppShell {
  const root = document.createElement("div");

  render(
    html`
      <div class="min-h-full flex flex-col">
        <header class="bg-surface border-b border-ring">
          <div
            class="max-w-layout mx-auto p-6 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <h1 class="text-3xl font-bold">Performance Management</h1>
              <p class="mt-1 text-muted text-sm">Monitor my daily activities</p>
            </div>
            <nav class="flex flex-wrap gap-2">
              ${links.map(
                ({ label, path, icon }) => html`
                  <a href=${path} class=${NAV_LINK}>
                    <span class="text-base">${icon}</span>${label}
                  </a>
                `,
              )}
            </nav>
          </div>
        </header>
        <main class="flex-1 py-8">
          <div
            id="shell-outlet"
            class="max-w-layout mx-auto p-6 flex flex-col gap-8"
          ></div>
        </main>
      </div>
    `,
    root,
  );

  const outlet = root.querySelector<HTMLElement>("#shell-outlet")!;
  return { root, outlet };
}
