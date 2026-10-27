<script setup lang="ts">
import type { Meta, SpeciesPage } from '#shared/types'

useHead({ title: null })

const route = useRoute()
const router = useRouter()

const filters = computed(() => ({
  q: queryString(route.query.q),
  type: queryString(route.query.type),
  generation: queryString(route.query.generation),
}))
const apiQuery = computed(() => ({ ...filters.value, page: queryString(route.query.page) }))

const [{ data: meta }, { data: list }] = await Promise.all([
  useFetch<Meta>('/api/meta'),
  useFetch<SpeciesPage>('/api/species', { query: apiQuery }),
])

/** A query object with empty and default values left out. */
function buildQuery(values: Record<string, string | number | undefined>) {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '' || (key === 'page' && Number(value) <= 1)) continue
    query[key] = String(value)
  }
  return query
}

function setFilter(key: 'q' | 'type' | 'generation', value: string, replace = false) {
  const query = buildQuery({ ...filters.value, [key]: value })
  return replace ? router.replace({ query }) : router.push({ query })
}

// Search updates the URL (and so the results) shortly after typing stops.
const search = ref(filters.value.q)
let lastSearch = search.value
let timer: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    lastSearch = search.value.trim()
    setFilter('q', lastSearch, true)
  }, 150)
}
watch(
  () => filters.value.q,
  (q) => {
    // Navigation (back/forward, links) changed the query: reflect it in the input.
    if (q !== lastSearch) {
      clearTimeout(timer)
      search.value = lastSearch = q
    }
  },
)
onBeforeUnmount(() => clearTimeout(timer))

const pageLink = (page: number) => ({ query: buildQuery({ ...filters.value, page }) })
</script>

<template>
  <div>
    <h1>Pokémon</h1>
    <form class="filters" role="search" @submit.prevent>
      <div class="field field--search">
        <label for="search">Search</label>
        <input id="search" v-model="search" type="search" autocomplete="off" @input="onSearchInput">
      </div>
      <div class="field">
        <label for="type">Type</label>
        <select id="type" :value="filters.type" @change="setFilter('type', ($event.target as HTMLSelectElement).value)">
          <option value="">All types</option>
          <option v-for="t in meta?.types" :key="t.name" :value="t.name">{{ t.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="generation">Generation</label>
        <select id="generation" :value="filters.generation" @change="setFilter('generation', ($event.target as HTMLSelectElement).value)">
          <option value="">All generations</option>
          <option v-for="g in meta?.generations" :key="g.name" :value="g.name">{{ g.label }}</option>
        </select>
      </div>
    </form>

    <template v-if="list">
      <p v-if="list.count" class="count">{{ list.count }} Pokémon</p>
      <p v-else class="count">No Pokémon found</p>
      <CardGrid v-if="list.count" :pokemon="list.results" />
      <nav v-if="list.count" class="pagination" aria-label="Pagination">
        <NuxtLink v-if="list.page > 1" :to="pageLink(list.page - 1)">Previous page</NuxtLink>
        <span>Page {{ list.page }} of {{ list.totalPages }}</span>
        <NuxtLink v-if="list.page < list.totalPages" :to="pageLink(list.page + 1)">Next page</NuxtLink>
      </nav>
    </template>
  </div>
</template>
