<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router'

const PAGE_SIZE = 48
const SEARCH_DEBOUNCE_MS = 150

const route = useRoute()
const router = useRouter()
const { data, error } = await useFetch('/api/species', { key: 'species-index' })

const queryString = (key: string) => {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}
const q = computed(() => queryString('q'))
const type = computed(() => queryString('type'))
const generation = computed(() => queryString('generation'))

const typeLabels = computed(() => new Map(data.value?.types.map((t) => [t.name, t.label])))

const matches = computed(() => {
  const needle = q.value.trim().toLowerCase()
  return (data.value?.species ?? []).filter(
    (s) =>
      (!needle || humanize(s.name).toLowerCase().includes(needle)) &&
      (!type.value || s.types.includes(type.value)) &&
      (!generation.value || s.generation === generation.value),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(matches.value.length / PAGE_SIZE)))
const page = computed(() => {
  const n = Number.parseInt(queryString('page'), 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), totalPages.value) : 1
})
const visible = computed(() => matches.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

/** Query for the given filters, leaving out empty and default values. */
function buildQuery(filters: { q?: string; type?: string; generation?: string; page?: number }): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  if (filters.q) query.q = filters.q
  if (filters.type) query.type = filters.type
  if (filters.generation) query.generation = filters.generation
  if (filters.page && filters.page > 1) query.page = String(filters.page)
  return query
}

const current = computed(() => ({ q: q.value, type: type.value, generation: generation.value }))
const pageLink = (n: number) => ({ path: '/', query: buildQuery({ ...current.value, page: n }) })

function setFilter(change: { q?: string; type?: string; generation?: string }) {
  router.replace({ path: '/', query: buildQuery({ ...current.value, ...change }) })
}

// The search box updates the URL (and so the results) shortly after typing stops.
const search = ref(q.value)
let timer: ReturnType<typeof setTimeout> | undefined
function onSearch(event: Event) {
  search.value = (event.target as HTMLInputElement).value
  clearTimeout(timer)
  timer = setTimeout(() => setFilter({ q: search.value }), SEARCH_DEBOUNCE_MS)
}
watch(q, (value) => {
  if (value !== search.value) search.value = value
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <h1>Pokémon</h1>
  <p v-if="error">The Pokédex could not be loaded. Please try again.</p>
  <template v-else-if="data">
    <form class="filters" role="search" @submit.prevent>
      <div class="field field--search">
        <label for="filter-search">Search</label>
        <input id="filter-search" type="search" :value="search" autocomplete="off" @input="onSearch" />
      </div>
      <div class="field">
        <label for="filter-type">Type</label>
        <select id="filter-type" :value="type" @change="setFilter({ type: ($event.target as HTMLSelectElement).value })">
          <option value="">All types</option>
          <option v-for="t in data.types" :key="t.name" :value="t.name">{{ t.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="filter-generation">Generation</label>
        <select
          id="filter-generation"
          :value="generation"
          @change="setFilter({ generation: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">All generations</option>
          <option v-for="g in data.generations" :key="g.name" :value="g.name">{{ g.label }}</option>
        </select>
      </div>
    </form>

    <p class="count" aria-live="polite">{{ matches.length ? `${matches.length} Pokémon` : 'No Pokémon found' }}</p>

    <template v-if="matches.length">
      <ul class="card-grid">
        <li v-for="s in visible" :key="s.id">
          <PokemonCard
            :id="s.id"
            :name="s.name"
            :types="s.types.map((t) => ({ name: t, label: typeLabels.get(t) ?? humanize(t) }))"
          />
        </li>
      </ul>
      <nav class="pagination" aria-label="Pagination">
        <NuxtLink v-if="page > 1" :to="pageLink(page - 1)">Previous page</NuxtLink>
        <span>Page {{ page }} of {{ totalPages }}</span>
        <NuxtLink v-if="page < totalPages" :to="pageLink(page + 1)">Next page</NuxtLink>
      </nav>
    </template>
  </template>
</template>
