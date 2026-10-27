// Minimal DOM-building helpers.

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'class') {
        el.className = String(value);
      } else {
        el.setAttribute(key, value === true ? '' : String(value));
      }
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

let sectionId = 0;

/** A `region` landmark named by its `h2`. */
export function section(title: string, attrs: Attrs = {}, ...children: Child[]) {
  const headingId = `section-${++sectionId}`;
  return h(
    'section',
    { class: 'card section', 'aria-labelledby': headingId, ...attrs },
    h('h2', { id: headingId }, title),
    ...children,
  );
}

export const DASH = '—';
export const orDash = (v: number | string | null | undefined) => (v == null || v === '' ? DASH : String(v));
