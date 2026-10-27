import { useId } from "react";

export function Section({
  title,
  id,
  className,
  children,
}: {
  title: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={`panel${className ? ` ${className}` : ""}`}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
