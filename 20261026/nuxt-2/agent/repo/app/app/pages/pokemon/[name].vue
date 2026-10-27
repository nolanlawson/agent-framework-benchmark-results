<script setup lang="ts">
const STAT_MAX = 255

const route = useRoute()
const router = useRouter()
const name = computed(() => String(route.params.name))
const game = computed(() => (typeof route.query.game === 'string' ? route.query.game : undefined))

const [{ data, error }, { data: moves }] = await Promise.all([
  useFetch(() => `/api/pokemon/${encodeURIComponent(name.value)}`),
  useFetch(() => `/api/pokemon/${encodeURIComponent(name.value)}/moves`, { query: { game } }),
])

useHead({ title: () => data.value?.label ?? '' })

const total = computed(() => data.value?.stats.reduce((sum, s) => sum + s.value, 0) ?? 0)
const statRows = computed(() => [
  ...(data.value?.stats ?? []).map((s) => ({ ...s, max: STAT_MAX })),
  { name: 'total', label: 'Total', value: total.value, max: STAT_MAX * Math.max(1, data.value?.stats.length ?? 0) },
])

function selectGame(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.replace({ query: { ...route.query, game: value }, hash: route.hash })
}
</script>

<template>
  <NotFound v-if="error?.statusCode === 404" />
  <p v-else-if="error">This Pokémon could not be loaded. Please try again.</p>
  <template v-else-if="data">
    <div class="profile">
      <div class="profile__art">
        <img v-if="data.artwork" :src="data.artwork" :alt="data.label" width="475" height="475" />
      </div>
      <div class="profile__info">
        <p class="profile__dex">{{ dexNumber(data.id) }}</p>
        <h1>{{ data.label }}</h1>
        <p v-if="data.genus" class="profile__genus">{{ data.genus }}</p>
        <p class="profile__types">
          <TypeBadge v-for="type in data.types" :key="type.name" :type="type" link />
        </p>
        <dl class="facts">
          <div>
            <dt>Height</dt>
            <dd>{{ (data.height / 10).toFixed(1) }} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ (data.weight / 10).toFixed(1) }} kg</dd>
          </div>
        </dl>
        <p v-if="data.flavor" class="profile__flavor">{{ data.flavor }}</p>
      </div>
    </div>

    <PageSection title="Base stats">
      <table class="stats">
        <tbody>
          <tr v-for="stat in statRows" :key="stat.name" :class="{ 'stats__total': stat.name === 'total' }">
            <th scope="row">{{ stat.label }}</th>
            <td class="stats__value">{{ stat.value }}</td>
            <td class="stats__bar" aria-hidden="true">
              <span class="bar"><span class="bar__fill" :style="{ width: `${Math.min(100, (stat.value / stat.max) * 100)}%` }" /></span>
            </td>
          </tr>
        </tbody>
      </table>
    </PageSection>

    <PageSection title="Abilities">
      <ul class="plain-list">
        <li v-for="ability in data.abilities" :key="ability.name">
          <NuxtLink :to="`/abilities/${ability.name}`">{{ humanize(ability.name) }}</NuxtLink>
          <template v-if="ability.hidden"> (hidden)</template>
        </li>
      </ul>
    </PageSection>

    <PageSection title="Evolution">
      <EvolutionTree v-if="data.evolution" :nodes="[data.evolution]" />
    </PageSection>

    <section id="moves" class="panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading" class="panel__title">Moves</h2>
      <template v-if="moves?.games.length">
        <div class="game-field">
          <label for="game-select">Game</label>
          <select id="game-select" :value="moves.game ?? ''" @change="selectGame">
            <option v-for="g in moves.games" :key="g.name" :value="g.name">{{ g.label }}</option>
          </select>
        </div>
        <MovesTable
          v-for="table in moves.tables"
          :key="table.method"
          :label="table.label"
          :rows="table.rows"
          :show-level="table.method === 'level-up'"
        />
      </template>
      <p v-else>This Pokémon learns no moves.</p>
    </section>
  </template>
</template>
