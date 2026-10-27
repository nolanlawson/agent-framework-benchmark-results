<script setup lang="ts">
interface PokemonPage {
  id: number
  name: string
  title: string
  genus: string | null
  types: TypeRef[]
  artwork: string | null
  height: number
  weight: number
  flavorText: string | null
  stats: { name: string; label: string; value: number }[]
  abilities: { name: string; label: string; hidden: boolean }[]
  evolution: EvolutionNode
  versionGroups: { name: string; label: string }[]
}

interface MovesData {
  game: string | null
  tables: MoveTable[]
}

const MAX_STAT = 255

const route = useRoute()
const router = useRouter()
const name = encodeURIComponent(String(route.params.name))
const game = computed(() => queryParam(route.query.game))

const [{ data: pokemon }, { data: moves }] = await Promise.all([
  usePageData<PokemonPage>(`/api/pokemon/${name}`),
  usePageData<MovesData>(`/api/pokemon/${name}/moves`, { query: { game } }),
])

useHead({ title: () => pokemon.value?.title })

const total = computed(() => pokemon.value!.stats.reduce((sum, stat) => sum + stat.value, 0))
const barWidth = (value: number, max: number) => `${Math.min(100, (value / max) * 100)}%`

const selectedGame = computed({
  get: () => (pokemon.value!.versionGroups.some((g) => g.name === game.value) ? game.value : (moves.value?.game ?? '')),
  set: (value: string) => router.replace({ query: { ...route.query, game: value }, hash: route.hash }),
})

const hydrated = useHydrated()
</script>

<template>
  <main v-if="pokemon" class="container page">
    <div class="summary">
      <div class="summary__artwork">
        <img v-if="pokemon.artwork" :src="pokemon.artwork" :alt="pokemon.title" width="475" height="475" />
      </div>
      <div class="summary__info">
        <p class="summary__dex">{{ dexNumber(pokemon.id) }}</p>
        <h1>{{ pokemon.title }}</h1>
        <p v-if="pokemon.genus" class="summary__genus">{{ pokemon.genus }}</p>
        <TypeBadges :types="pokemon.types" link class="summary__types" />
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
          <tr v-for="stat in pokemon.stats" :key="stat.name">
            <th scope="row">{{ stat.label }}</th>
            <td>{{ stat.value }}</td>
            <td class="stats__bar" aria-hidden="true">
              <span class="stats__track"><span :style="{ width: barWidth(stat.value, MAX_STAT) }" /></span>
            </td>
          </tr>
          <tr class="stats__total">
            <th scope="row">Total</th>
            <td>{{ total }}</td>
            <td class="stats__bar" aria-hidden="true">
              <span class="stats__track"><span :style="{ width: barWidth(total, MAX_STAT * pokemon.stats.length) }" /></span>
            </td>
          </tr>
        </tbody>
      </table>
    </PageSection>

    <PageSection title="Abilities">
      <ul class="plain-list">
        <li v-for="ability in pokemon.abilities" :key="ability.name">
          <NuxtLink :to="`/abilities/${ability.name}`">{{ ability.label }}</NuxtLink>
          <template v-if="ability.hidden"> (hidden)</template>
        </li>
      </ul>
    </PageSection>

    <PageSection title="Evolution">
      <EvolutionTree :nodes="[pokemon.evolution]" class="plain-list evolution" />
    </PageSection>

    <PageSection id="moves" title="Moves">
      <template v-if="pokemon.versionGroups.length">
        <div class="game">
          <label for="game">Game</label>
          <select id="game" v-model="selectedGame" :disabled="!hydrated">
            <option v-for="g in pokemon.versionGroups" :key="g.name" :value="g.name">{{ g.label }}</option>
          </select>
        </div>
        <template v-if="moves">
          <MoveTable v-for="table in moves.tables" :key="`${moves.game}-${table.method}`" :table="table" />
        </template>
      </template>
      <p v-else>This Pokémon doesn't learn any moves.</p>
    </PageSection>
  </main>
</template>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: 1fr;
  justify-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

@media (min-width: 48rem) {
  .summary {
    grid-template-columns: var(--artwork-size) 1fr;
    justify-items: stretch;
    gap: var(--space-6);
  }
}

.summary__artwork {
  width: var(--artwork-size);
  max-width: 100%;
  aspect-ratio: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.summary__artwork img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.summary__info {
  justify-self: stretch;
  padding-top: 1.125rem;
}

@media (max-width: 47.999rem) {
  .summary__info {
    padding-top: 0;
  }
}

.summary__dex,
.summary__genus {
  margin: 0;
  color: var(--color-text-muted);
}

.summary h1 {
  margin: 0;
}

.summary__genus {
  margin-top: var(--space-1);
}

.summary__types {
  margin-top: var(--space-3);
}

.summary .facts {
  margin-top: var(--space-4);
}

.summary__flavor {
  margin: var(--space-4) 0 0;
}

.stats {
  width: 100%;
  border-collapse: collapse;
}

.stats th {
  width: 6rem;
  padding: var(--space-1) 0;
  color: var(--color-text-muted);
  font-weight: var(--weight-normal);
  text-align: left;
}

.stats td {
  padding: var(--space-1) 0;
}

.stats td:nth-child(2) {
  width: 3rem;
}

.stats__track {
  display: block;
  height: 0.5rem;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-stat-track);
}

.stats__track span {
  display: block;
  height: 100%;
  background: var(--color-stat-bar);
}

.stats__total th,
.stats__total td {
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.evolution {
  padding-left: var(--space-4);
}

.game {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.game label {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.game select {
  width: auto;
  min-width: 16.5rem;
  max-width: 100%;
}
</style>
