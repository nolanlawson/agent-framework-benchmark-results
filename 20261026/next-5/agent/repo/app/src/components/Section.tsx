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
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={className ? `panel ${className}` : 'panel'}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}
