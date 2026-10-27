<script setup lang="ts">
interface PokedexPage {
  types: TypeRef[]
  generations: { name: string; label: string }[]
  count: number
  page: number
  totalPages: number
  results: Card[]
}

const route = useRoute()
const router = useRouter()

const filters = computed(() => ({
  q: queryParam(route.query.q),
  type: queryParam(route.query.type),
  generation: queryParam(route.query.generation),
  page: queryParam(route.query.page),
}))

const { data } = await usePageData<PokedexPage>('/api/pokedex', { query: filters })

useHead({ title: '' })

/** URL query for the given filters, leaving out empty and default values. */
function toQuery(values: Partial<Record<'q' | 'type' | 'generation' | 'page', string>>) {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => value && !(key === 'page' && value === '1')))
}

// Changing a filter goes back to page 1.
function setFilter(patch: { q?: string; type?: string; generation?: string }, replace = false) {
  const { q, type, generation } = filters.value
  const location = { query: toQuery({ q, type, generation, ...patch }) }
  return replace ? router.replace(location) : router.push(location)
}

const pageLink = (page: number) => ({ query: toQuery({ ...filters.value, page: String(page) }) })

const type = computed({ get: () => filters.value.type, set: (value) => setFilter({ type: value }) })
const generation = computed({ get: () => filters.value.generation, set: (value) => setFilter({ generation: value }) })

// The search box updates the results as the user types, with a short debounce.
const search = ref(filters.value.q)
let committedSearch = filters.value.q
let searchTimer: ReturnType<typeof setTimeout> | undefined

function commitSearch() {
  clearTimeout(searchTimer)
  const q = search.value.trim()
  if (q === filters.value.q) return
  committedSearch = q
  setFilter({ q }, true)
}

function onSearchInput(event: Event) {
  search.value = (event.target as HTMLInputElement).value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(commitSearch, 200)
}

// Follow URL changes that didn't come from typing (back/forward, links).
watch(
  () => filters.value.q,
  (q) => {
    if (q === committedSearch) return
    committedSearch = q
    search.value = q
  },
)

// Keep anything typed before the page finished loading.
onBeforeMount(() => {
  const typed = (document.getElementById('search') as HTMLInputElement | null)?.value
  if (typed !== undefined && typed !== search.value) {
    search.value = typed
    searchTimer = setTimeout(commitSearch, 200)
  }
})
onBeforeUnmount(() => clearTimeout(searchTimer))

const hydrated = useHydrated()
</script>

<template>
  <main class="container page">
    <h1>Pokémon</h1>

    <form class="filters" role="search" @submit.prevent="commitSearch">
      <div class="field filters__search">
        <label for="search">Search</label>
        <input id="search" type="search" name="q" autocomplete="off" :value="search" @input="onSearchInput" />
      </div>
      <div class="field">
        <label for="type">Type</label>
        <select id="type" v-model="type" name="type" :disabled="!hydrated">
          <option value="">All types</option>
          <option v-for="t in data!.types" :key="t.name" :value="t.name">{{ t.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="generation">Generation</label>
        <select id="generation" v-model="generation" name="generation" :disabled="!hydrated">
          <option value="">All generations</option>
          <option v-for="g in data!.generations" :key="g.name" :value="g.name">{{ g.label }}</option>
        </select>
      </div>
    </form>

    <p class="count">{{ data!.count }} Pokémon</p>

    <template v-if="data!.results.length">
      <CardList :cards="data!.results" />
      <nav class="pagination" aria-label="Pagination">
        <NuxtLink v-if="data!.page > 1" :to="pageLink(data!.page - 1)">Previous page</NuxtLink>
        <span>Page {{ data!.page }} of {{ data!.totalPages }}</span>
        <NuxtLink v-if="data!.page < data!.totalPages" :to="pageLink(data!.page + 1)">Next page</NuxtLink>
      </nav>
    </template>
    <p v-else class="empty">No Pokémon found</p>
  </main>
</template>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

@media (min-width: 48rem) {
  .filters {
    grid-template-columns: 2fr 1fr 1fr;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: var(--space-5);
  margin-top: var(--space-5);
  font-size: var(--text-sm);
}

.empty {
  margin: var(--space-6) 0;
  text-align: center;
}
</style>
