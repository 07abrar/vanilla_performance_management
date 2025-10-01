export type ElementOptions = {
  className?: string;
  textContent?: string;
  attrs?: Record<string, string>;
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: (HTMLElement | Text)[] = []
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.textContent !== undefined) element.textContent = options.textContent;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  children.forEach((child) => element.append(child));
  return element;
}

export function setChildren(parent: HTMLElement, children: (HTMLElement | Text)[]): void {
  parent.replaceChildren(...children);
}

export function createButton(
  label: string,
  variant: 'primary' | 'danger' | 'ghost' = 'ghost',
  options: { type?: 'button' | 'submit'; disabled?: boolean } = {}
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = options.type ?? 'button';
  button.textContent = label;
  const classes: string[] = [];
  if (variant === 'primary') classes.push('primary-button');
  if (variant === 'danger') classes.push('danger-button');
  button.className = classes.join(' ');
  if (options.disabled) button.disabled = true;
  return button;
}

export function createCard(className = ''): HTMLElement {
  const card = document.createElement('section');
  card.className = ['card', className].filter(Boolean).join(' ');
  return card;
}

export function renderList<T>(
  container: HTMLElement,
  items: T[],
  renderItem: (item: T) => HTMLElement
): void {
  if (!items.length) {
    setChildren(container, [el('p', { className: 'empty-state', textContent: 'No items yet.' })]);
    return;
  }
  const list = el('div', { className: 'list' }, items.map((item) => renderItem(item)));
  setChildren(container, [list]);
}

export function showMessage(
  container: HTMLElement,
  message: string | null,
  type: 'error' | 'success'
): void {
  if (!message) {
    container.textContent = '';
    container.className = 'status-message';
    return;
  }
  container.textContent = message;
  container.className = `status-message ${type === 'error' ? 'status-error' : 'status-success'}`;
}

export function formatMinutes(minutes: number): string {
  return `${minutes} min`;
}