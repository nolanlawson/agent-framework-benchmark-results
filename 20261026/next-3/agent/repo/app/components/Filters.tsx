"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Option = { name: string; label: string };
type State = { q: string; type: string; generation: string };

type Props = State & { types: Option[]; generations: Option[] };

const SEARCH_DEBOUNCE_MS = 200;

function href(pathname: string, state: State): string {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.type) params.set("type", state.type);
  if (state.generation) params.set("generation", state.generation);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function Filters({ q, type, generation, types, generations }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<State>({ q, type, generation });
  // The query we last put in the URL, so a slow navigation finishing doesn't overwrite
  // what the user has typed since.
  const sentQuery = useRef(q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow URL changes made elsewhere (back/forward, links).
  useEffect(() => {
    setState((s) => ({
      q: q === sentQuery.current ? s.q : q,
      type,
      generation,
    }));
    sentQuery.current = q;
  }, [q, type, generation]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(next: State, replace: boolean) {
    sentQuery.current = next.q.trim();
    const url = href(pathname, next);
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }

  function onSearch(value: string) {
    const next = { ...state, q: value };
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate(next, true), SEARCH_DEBOUNCE_MS);
  }

  function onSelect(key: "type" | "generation", value: string) {
    const next = { ...state, [key]: value };
    setState(next);
    clearTimeout(timer.current);
    navigate(next, false);
  }

  return (
    <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
      <div className="field filters__search">
        <label htmlFor="filter-q">Search</label>
        <input
          id="filter-q"
          type="search"
          name="q"
          autoComplete="off"
          value={state.q}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filter-type">Type</label>
        <select id="filter-type" name="type" value={state.type} onChange={(e) => onSelect("type", e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-generation">Generation</label>
        <select
          id="filter-generation"
          name="generation"
          value={state.generation}
          onChange={(e) => onSelect("generation", e.target.value)}
        >
          <option value="">All generations</option>
          {generations.map((g) => (
            <option key={g.name} value={g.name}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
