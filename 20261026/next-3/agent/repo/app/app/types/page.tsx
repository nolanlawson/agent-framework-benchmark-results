import type { Metadata } from "next";
import Link from "next/link";
import { getTypes } from "@/lib/data";

export const metadata: Metadata = { title: "Types" };

export default async function TypesPage() {
  const types = await getTypes();
  return (
    <>
      <h1 className="page-title">Types</h1>
      <ul className="type-grid">
        {types.map((t) => (
          <li key={t.name}>
            <Link href={`/types/${t.name}`} style={{ "--type-color": `var(--type-${t.name})` } as React.CSSProperties}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
