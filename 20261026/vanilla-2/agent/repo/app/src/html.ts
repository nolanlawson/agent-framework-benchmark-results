// Tiny HTML templating: `html` escapes interpolated values unless they are already
// trusted markup (another `html` result, or an array of them).

export class SafeHtml {
  constructor(readonly value: string) {}
  toString() {
    return this.value;
  }
}

type Value = SafeHtml | string | number | null | undefined | false | Value[];

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c]);

function render(value: Value): string {
  if (value == null || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escape(String(value));
}

export function html(strings: TemplateStringsArray, ...values: Value[]): SafeHtml {
  let out = strings[0];
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1];
  });
  return new SafeHtml(out);
}
