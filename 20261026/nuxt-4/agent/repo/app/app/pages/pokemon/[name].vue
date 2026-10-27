<script setup lang="ts">
import type { EvolutionNode } from '~/components/EvolutionList.vue';
import type { MoveRow } from '~/components/MoveTable.vue';

interface TypeRef {
  name: string;
  label: string;
}
interface PokemonData {
  id: number;
  name: string;
  label: string;
  genus: string | null;
  flavorText: string | null;
  types: TypeRef[];
  artwork: string | null;
  height: number;
  weight: number;
  stats: { name: string; label: string; value: number }[];
  abilities: { name: string; label: string; hidden: boolean }[];
  evolution: EvolutionNode;
  games: { name: string; label: string }[];
  moves: {
    name: string;
    label: string;
    type: TypeRef | null;
    category: string | null;
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    learn: [string, string, number][];
  }[];
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const MAX_STAT = 255;

const route = useRoute();
const router = useRouter();
const pokemon = await usePageData<PokemonData>(`/api/pokemon/${encodeURIComponent(String(route.params.name))}`);
useHead({ title: () => pokemon.value.label });

const total = computed(() => pokemon.value.stats.reduce((sum, s) => sum + s.value, 0));
const statWidth = (value: number, max = MAX_STAT) => `${Math.min(100, (value / max) * 100)}%`;

const game = computed({
  get: () => {
    const requested = queryString(route.query.game);
    const games = pokemon.value.games;
    return games.some((g) => g.name === requested) ? requested : (games[games.length - 1]?.name ?? '');
  },
  set: (value: string) => {
    router.replace({ query: { ...route.query, game: value }, hash: route.hash });
  },
});

const tables = computed(() => {
  const byMethod = new Map<string, MoveRow[]>();
  for (const move of pokemon.value.moves) {
    for (const [vg, method, level] of move.learn) {
      if (vg !== game.value) continue;
      if (!byMethod.has(method)) byMethod.set(method, []);
      byMethod.get(method)!.push({
        key: `${move.name}-${level}`,
        level: method === 'level-up' ? level : null,
        name: move.name,
        label: move.label,
        type: move.type,
        category: move.category,
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
      });
    }
  }
  const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
  return [...byMethod.entries()]
    .map(([method, rows]) => ({ method, caption: humanize(method), rows }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.caption.localeCompare(b.caption));
});
</script>

<template>
  <div class="stack">
    <div class="summary">
      <div class="summary__art">
        <img v-if="pokemon.artwork" :src="pokemon.artwork" :alt="pokemon.label" width="475" height="475" />
      </div>
      <div class="summary__info">
        <p class="summary__number">{{ dexNumber(pokemon.id) }}</p>
        <h1>{{ pokemon.label }}</h1>
        <p v-if="pokemon.genus" class="summary__genus">{{ pokemon.genus }}</p>
        <p class="badges">
          <TypeBadge v-for="t in pokemon.types" :key="t.name" :type="t" link />
        </p>
        <dl class="facts">
          <div>
            <dt>Height</dt>
            <dd>{{ (pokemon.height / 10).toFixed(1) }} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ (pokemon.weight / 10).toFixed(1) }} kg</dd>
          </div>
        </dl>
        <p v-if="pokemon.flavorText" class="summary__flavor">{{ pokemon.flavorText }}</p>
      </div>
    </div>

    <PageSection title="Base stats">
      <table class="stats">
        <tbody>
          <tr v-for="s in pokemon.stats" :key="s.name">
            <th scope="row">{{ s.label }}</th>
            <td class="stats__value">{{ s.value }}</td>
            <td class="stats__bar" aria-hidden="true">
              <span class="bar"><span class="bar__fill" :style="{ width: statWidth(s.value) }" /></span>
            </td>
          </tr>
          <tr class="stats__total">
            <th scope="row">Total</th>
            <td class="stats__value">{{ total }}</td>
            <td class="stats__bar" aria-hidden="true">
              <span class="bar"><span class="bar__fill" :style="{ width: statWidth(total, MAX_STAT * 6) }" /></span>
            </td>
          </tr>
        </tbody>
      </table>
    </PageSection>

    <PageSection title="Abilities">
      <ul class="plain-list">
        <li v-for="a in pokemon.abilities" :key="a.name">
          <NuxtLink :to="`/abilities/${a.name}`">{{ a.label }}</NuxtLink><template v-if="a.hidden"> (hidden)</template>
        </li>
      </ul>
    </PageSection>

    <PageSection title="Evolution">
      <EvolutionList :nodes="[pokemon.evolution]" />
    </PageSection>

    <PageSection id="moves" title="Moves">
      <template v-if="pokemon.games.length">
        <div class="game-picker">
          <label for="game">Game</label>
          <select id="game" v-model="game">
            <option v-for="g in pokemon.games" :key="g.name" :value="g.name">{{ g.label }}</option>
          </select>
        </div>
        <MoveTable
          v-for="t in tables"
          :key="`${game}-${t.method}`"
          :caption="t.caption"
          :rows="t.rows"
          :show-level="t.method === 'level-up'"
        />
      </template>
      <p v-else>—</p>
    </PageSection>
  </div>
</template>
