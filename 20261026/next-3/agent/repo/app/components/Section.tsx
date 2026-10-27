type Props = { title: string; id?: string; children: React.ReactNode };

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// A titled region: a <section> named by its heading.
export function Section({ title, id, children }: Props) {
  const headingId = `${id ?? slug(title)}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="panel">
      <h2 id={headingId} className="panel__title">
        {title}
      </h2>
      {children}
    </section>
  );
}
