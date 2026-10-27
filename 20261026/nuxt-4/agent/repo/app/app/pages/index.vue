<script setup lang="ts">
interface IndexData {
  pokemon: { id: number; name: string; sprite: string; generation: string | null; types: string[] }[];
  types: { name: string; label: string }[];
  generations: { name: string; label: string }[];
}

const PAGE_SIZE = 48;
const route = useRoute();
const router = useRouter();
const data = await usePageData<IndexData>('/api/pokedex');

const typeLabels = computed(() => Object.fromEntries(data.value.types.map((t) => [t.name, t.label])));
const q = computed(() => queryString(route.query.q));
const type = computed(() => queryString(route.query.type));
const generation = computed(() => queryString(route.query.generation));

function setFilter(changes: Record<string, string>) {
  const query: Record<string, string> = {};
  for (const key of ['q', 'type', 'generation']) {
    const value = key in changes ? changes[key] : queryString(route.query[key]);
    if (value) query[key] = value;
  }
  router.replace({ query, hash: route.hash });
}

// The search box is the source of truth while typing; the URL follows it.
const search = ref(q.value);
watch(q, (value) => {
  if (value !== search.value) search.value = value;
});
const onSearch = (event: Event) => {
  search.value = (event.target as HTMLInputElement).value;
  setFilter({ q: search.value });
};

const typeModel = computed({ get: () => type.value, set: (value) => setFilter({ type: value }) });
const generationModel = computed({ get: () => generation.value, set: (value) => setFilter({ generation: value }) });

const matches = computed(() => {
  const needle = search.value.trim().toLowerCase();
  return data.value.pokemon.filter(
    (p) =>
      (!needle || humanize(p.name).toLowerCase().includes(needle)) &&
      (!type.value || p.types.includes(type.value)) &&
      (!generation.value || p.generation === generation.value),
  );
});

const totalPages = computed(() => Math.max(1, Math.ceil(matches.value.length / PAGE_SIZE)));
const page = computed(() => {
  const n = Number.parseInt(queryString(route.query.page), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), totalPages.value) : 1;
});
const visible = computed(() => matches.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));

const pageLink = (n: number) => {
  const query = { ...route.query };
  if (n > 1) query.page = String(n);
  else delete query.page;
  return { query };
};

const cardTypes = (types: string[]) => types.map((name) => ({ name, label: typeLabels.value[name] ?? humanize(name) }));
</script>

<template>
  <div>
    <h1>Pokémon</h1>
    <form class="filters" role="search" @submit.prevent>
      <div class="field field--search">
        <label for="search">Search</label>
        <input id="search" type="search" :value="search" autocomplete="off" @input="onSearch" />
      </div>
      <div class="field">
        <label for="type">Type</label>
        <select id="type" v-model="typeModel">
          <option value="">All types</option>
          <option v-for="t in data.types" :key="t.name" :value="t.name">{{ t.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="generation">Generation</label>
        <select id="generation" v-model="generationModel">
          <option value="">All generations</option>
          <option v-for="g in data.generations" :key="g.name" :value="g.name">{{ g.label }}</option>
        </select>
      </div>
    </form>

    <p class="count">{{ matches.length }} Pokémon</p>
    <template v-if="matches.length">
      <CardGrid>
        <li v-for="p in visible" :key="p.id">
          <PokemonCard :pokemon="p" :types="cardTypes(p.types)" />
        </li>
      </CardGrid>
      <nav class="pagination" aria-label="Pagination">
        <NuxtLink v-if="page > 1" :to="pageLink(page - 1)">Previous page</NuxtLink>
        <span>Page {{ page }} of {{ totalPages }}</span>
        <NuxtLink v-if="page < totalPages" :to="pageLink(page + 1)">Next page</NuxtLink>
      </nav>
    </template>
    <p v-else class="empty">No Pokémon found</p>
  </div>
</template>
