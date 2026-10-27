<script setup lang="ts">
import type { PokemonDetail, PokemonMoves } from '#shared/types'

const route = useRoute()
const router = useRouter()
const base = `/api/pokemon/${encodeURIComponent(String(route.params.name))}`

const game = computed(() => queryString(route.query.game))
const [pokemon, { data: moves }] = await Promise.all([
  usePageData<PokemonDetail>(base),
  useFetch<PokemonMoves>(`${base}/moves`, { query: { game } }),
])
useHead({ title: () => pokemon.value.label })

const MAX_STAT = 255
const total = computed(() => pokemon.value.stats.reduce((sum, s) => sum + s.value, 0))
const barWidth = (value: number, max: number) => `${Math.min(100, (value / max) * 100).toFixed(1)}%`

function selectGame(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.replace({ query: { ...route.query, game: value }, hash: route.hash })
}
</script>

<template>
  <div>
    <div class="summary">
      <div class="summary__art">
        <img v-if="pokemon.artwork" :src="pokemon.artwork" :alt="pokemon.label" width="475" height="475">
      </div>
      <div class="summary__info">
        <p class="summary__dex">{{ dexNumber(pokemon.id) }}</p>
        <h1>{{ pokemon.label }}</h1>
        <p class="summary__genus">{{ pokemon.genus }}</p>
        <ul class="badges">
          <li v-for="t in pokemon.types" :key="t.name"><TypeBadge :type="t" link /></li>
        </ul>
        <dl class="summary__measures">
          <div>
            <dt>Height</dt>
            <dd>{{ pokemon.height.toFixed(1) }} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ pokemon.weight.toFixed(1) }} kg</dd>
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
            <td>{{ s.value }}</td>
            <td class="stats__bar" aria-hidden="true"><span class="stats__track"><span class="stats__fill" :style="{ width: barWidth(s.value, MAX_STAT) }" /></span></td>
          </tr>
          <tr class="stats__total">
            <th scope="row">Total</th>
            <td>{{ total }}</td>
            <td class="stats__bar" aria-hidden="true"><span class="stats__track"><span class="stats__fill" :style="{ width: barWidth(total, MAX_STAT * pokemon.stats.length) }" /></span></td>
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
      <EvolutionTree v-if="pokemon.evolution" :nodes="[pokemon.evolution]" />
    </PageSection>

    <PageSection id="moves" title="Moves">
      <template v-if="moves?.games.length">
        <div class="field field--inline">
          <label for="game">Game</label>
          <select id="game" :value="moves.selected" @change="selectGame">
            <option v-for="g in moves.games" :key="g.name" :value="g.name">{{ g.label }}</option>
          </select>
        </div>
        <MovesTable v-for="t in moves.tables" :key="`${moves.selected}-${t.method}`" :table="t" />
      </template>
      <p v-else>{{ MISSING }}</p>
    </PageSection>
  </div>
</template>
