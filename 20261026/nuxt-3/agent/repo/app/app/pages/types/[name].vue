<script setup lang="ts">
interface TypePage {
  name: string
  title: string
  relations: { label: string; types: TypeRef[] }[]
  pokemon: Card[]
  moves: { name: string; label: string }[]
}

const route = useRoute()
const { data } = await usePageData<TypePage>(`/api/types/${encodeURIComponent(String(route.params.name))}`)

useHead({ title: () => data.value?.title })
</script>

<template>
  <main v-if="data" class="container page">
    <h1>{{ data.title }}</h1>

    <PageSection title="Damage relations">
      <dl class="relations">
        <div v-for="relation in data.relations" :key="relation.label">
          <dt>{{ relation.label }}</dt>
          <dd>
            <TypeBadges v-if="relation.types.length" :types="relation.types" link />
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </PageSection>

    <PageSection title="Pokémon">
      <p class="count">{{ data.pokemon.length }} Pokémon</p>
      <CardList :cards="data.pokemon" />
    </PageSection>

    <PageSection title="Moves">
      <p class="count">{{ data.moves.length }} moves</p>
      <ul class="move-links">
        <li v-for="move in data.moves" :key="move.name">
          <NuxtLink :to="`/moves/${move.name}`">{{ move.label }}</NuxtLink>
        </li>
      </ul>
    </PageSection>
  </main>
</template>

<style scoped>
.relations {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin: 0;
}

@media (min-width: 48rem) {
  .relations {
    grid-template-columns: 1fr 1fr;
  }
}

.relations dt {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.relations dd {
  margin: var(--space-1) 0 0;
}

.move-links {
  columns: 10rem;
  column-gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
}

.move-links li {
  padding: var(--space-1) 0;
  break-inside: avoid;
}
</style>
