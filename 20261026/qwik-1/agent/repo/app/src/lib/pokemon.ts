import { api, apiOrNull, english, latestEnglishFlavor, typeLabels, typeRef } from "./api";
import { humanize, padDex, type TypeRef } from "./format";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

export type EvolutionNode = { name: string; label: string; children: EvolutionNode[] };

export type MoveRow = {
  key: string;
  level: number | null;
  name: string;
  label: string;
  type: TypeRef | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type MoveTable = { method: string; label: string; rows: MoveRow[] };

function evolutionTree(link: any): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(evolutionTree),
  };
}

const byLabel = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);

export async function pokemonData(name: string, game: string | null) {
  const species = await apiOrNull(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
  if (!species) return null;
  const variety =
    species.varieties?.find((v: any) => v.is_default)?.pokemon ?? { url: `pokemon/${species.id}` };

  const [pokemon, chain, labels] = await Promise.all([
    api(variety.url),
    species.evolution_chain?.url ? apiOrNull(species.evolution_chain.url) : null,
    typeLabels(),
  ]);

  const types = [...pokemon.types]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => typeRef(labels, t.type.name));

  const stats: { name: string; label: string; value: number }[] = pokemon.stats.map((s: any) => ({
    name: s.stat.name as string,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  const abilities = [...pokemon.abilities]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((a: any) => ({
      name: a.ability.name as string,
      label: humanize(a.ability.name),
      hidden: !!a.is_hidden,
    }));

  // Version groups in which the Pokémon learns moves, ordered by the group's `order`.
  const groupNames = new Set<string>();
  for (const m of pokemon.moves)
    for (const d of m.version_group_details) groupNames.add(d.version_group.name);
  const groups = (
    await Promise.all(
      [...groupNames].map(async (g) => {
        const data = await apiOrNull(`version-group/${g}`);
        return { name: g, label: humanize(g), order: (data?.order as number) ?? Infinity };
      }),
    )
  ).sort((a, b) => a.order - b.order);
  const selected =
    groups.find((g) => g.name === game)?.name ?? groups[groups.length - 1]?.name ?? null;

  // Rows per learn method for the selected version group.
  const byMethod = new Map<string, { move: any; level: number }[]>();
  for (const m of pokemon.moves) {
    const seen = new Set<string>();
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selected) continue;
      const method = d.move_learn_method.name;
      const key = `${method}:${method === "level-up" ? d.level_learned_at : ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const list = byMethod.get(method) ?? [];
      list.push({ move: m.move, level: d.level_learned_at });
      byMethod.set(method, list);
    }
  }
  const moveNames = new Set<string>();
  for (const list of byMethod.values()) for (const e of list) moveNames.add(e.move.url);
  const moveDetails = new Map<string, any>();
  await Promise.all(
    [...moveNames].map(async (url) => moveDetails.set(url, await apiOrNull(url))),
  );

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });
  const tables: MoveTable[] = methods.map((method) => {
    const rows: MoveRow[] = byMethod.get(method)!.map(({ move, level }) => {
      const d = moveDetails.get(move.url);
      return {
        key: `${move.name}-${level}`,
        level: method === "level-up" ? level : null,
        name: move.name,
        label: english(d?.names) ?? humanize(move.name),
        type: d?.type ? typeRef(labels, d.type.name) : null,
        category: d?.damage_class ? humanize(d.damage_class.name) : null,
        power: d?.power ?? null,
        accuracy: d?.accuracy ?? null,
        pp: d?.pp ?? null,
      };
    });
    rows.sort(method === "level-up" ? (a, b) => a.level! - b.level! || byLabel(a, b) : byLabel);
    return { method, label: humanize(method), rows };
  });

  const art = pokemon.sprites?.other?.["official-artwork"]?.front_default ?? pokemon.sprites?.front_default ?? null;
  const englishName = english(species.names) ?? humanize(species.name);

  return {
    id: species.id as number,
    name: species.name as string,
    title: englishName,
    dex: padDex(species.id),
    genus: english(species.genera, "genus") ?? null,
    types,
    artwork: art as string | null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor: latestEnglishFlavor(species.flavor_text_entries) ?? null,
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities,
    evolution: chain?.chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    games: groups.map(({ name, label }) => ({ name, label })),
    game: selected,
    tables,
  };
}
