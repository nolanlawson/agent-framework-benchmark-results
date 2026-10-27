"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = { value: string; options: { name: string; label: string }[] };

export function GameSelect({ value, options }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState(value);

  useEffect(() => setSelected(value), [value]);

  return (
    <div className="game-select">
      <label htmlFor="game-select">Game</label>
      <select
        id="game-select"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          router.replace(`${pathname}?game=${encodeURIComponent(e.target.value)}`, { scroll: false });
        }}
      >
        {options.map((o) => (
          <option key={o.name} value={o.name}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
