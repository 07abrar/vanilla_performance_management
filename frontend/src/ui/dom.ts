export type ElementOptions = {
  className?: string;
  textContent?: string;
  attrs?: Record<string, string>;
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: (HTMLElement | Text)[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.textContent !== undefined)
    element.textContent = options.textContent;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  children.forEach((child) => element.append(child));
  return element;
}

export function setChildren(
  parent: HTMLElement,
  children: (HTMLElement | Text)[],
): void {
  parent.replaceChildren(...children);
}

const BUTTON_BASE =
  "rounded-full px-4 py-2.5 text-sm font-semibold border border-transparent " +
  "transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

const BUTTON_GHOST = "bg-surface text-muted-strong hover:bg-slate-200";

const BUTTON_PRIMARY =
  "bg-primary text-white border-primary hover:bg-primary-dark " +
  "disabled:bg-[rgba(37,99,235,0.6)] disabled:border-[rgba(37,99,235,0.6)] disabled:text-white";

const BUTTON_DANGER =
  "bg-danger-bg text-danger-fg border-danger-border hover:bg-red-200";

const CARD_BASE =
  "bg-surface border border-ring rounded-2xl p-6 " +
  "shadow-[0_24px_40px_rgba(15,23,42,0.06)] flex flex-col gap-5";

export function createButton(
  label: string,
  variant: "primary" | "danger" | "ghost" = "ghost",
  options: { type?: "button" | "submit"; disabled?: boolean } = {},
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = options.type ?? "button";
  button.textContent = label;
  const variantClasses =
    variant === "primary"
      ? BUTTON_PRIMARY
      : variant === "danger"
        ? BUTTON_DANGER
        : BUTTON_GHOST;
  button.className = `${BUTTON_BASE} ${variantClasses}`;
  if (options.disabled) button.disabled = true;
  return button;
}

export function createCard(className = ""): HTMLElement {
  const card = document.createElement("section");
  card.className = [CARD_BASE, className].filter(Boolean).join(" ");
  return card;
}

export function renderList<T>(
  container: HTMLElement,
  items: T[],
  renderItem: (item: T) => HTMLElement,
): void {
  if (!items.length) {
    setChildren(container, [
      el("p", {
        className:
          "p-6 text-center text-muted border border-dashed border-ring rounded-xl bg-white/60",
        textContent: "No items yet.",
      }),
    ]);
    return;
  }
  const list = el(
    "div",
    { className: "mt-2.5 border-t border-dashed border-ring pt-2.5" },
    items.map((item) => renderItem(item)),
  );
  setChildren(container, [list]);
}

export function showMessage(
  container: HTMLElement,
  message: string | null,
  type: "error" | "success",
): void {
  if (!message) {
    container.textContent = "";
    container.className = "text-sm text-muted-strong";
    return;
  }
  container.textContent = message;
  container.className =
    type === "error" ? "text-sm text-danger-fg" : "text-sm text-teal-700";
}

export function formatMinutes(minutes: number): string {
  return `${minutes} min`;
}
