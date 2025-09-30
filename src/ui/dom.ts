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
  className = '',
  options: { type?: 'button' | 'submit'; disabled?: boolean } = {}
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = options.type ?? 'button';
  button.textContent = label;
  button.className = className;
  if (options.disabled) button.disabled = true;
  return button;
}

export function createCard(title: string): HTMLElement {
  const header = el('h2', { textContent: title });
  return el('div', { className: 'card' }, [header]);
}

export function renderList<T>(
  container: HTMLElement,
  items: T[],
  renderItem: (item: T) => HTMLElement
): void {
  if (!items.length) {
    setChildren(container, [el('div', { className: 'empty-state muted', textContent: 'Nothing here yet.' })]);
    return;
  }
  const list = el('div', { className: 'list' }, items.map((item) => renderItem(item)));
  setChildren(container, [list]);
}

export function showMessage(container: HTMLElement, message: string | null, type: 'error' | 'success'): void {
  if (!message) {
    container.textContent = '';
    container.className = '';
    return;
  }
  container.textContent = message;
  container.className = type === 'error' ? 'error-text' : 'success-text';
}

export function createField(labelText: string, input: HTMLElement, helper?: HTMLElement): HTMLElement {
  const label = el('label', { className: 'field-label', textContent: labelText });
  label.append(input);
  const wrapperChildren: (HTMLElement | Text)[] = [label];
  if (helper) {
    const helperWrapper = el('div');
    helperWrapper.append(helper);
    wrapperChildren.push(helperWrapper);
  }
  return el('div', {}, wrapperChildren);
}

export function formatMinutes(minutes: number): string {
  return `${minutes} min`;
}