export function Section({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={`panel ${className ?? ''}`.trim()}>
      <h2 id={headingId} className="panel-title">
        {title}
      </h2>
      {children}
    </section>
  );
}
