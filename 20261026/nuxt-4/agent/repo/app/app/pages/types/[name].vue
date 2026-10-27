<script setup lang="ts">
interface TypeRef {
  name: string;
  label: string;
}
interface TypeData {
  name: string;
  label: string;
  relations: { label: string; types: TypeRef[] }[];
  pokemon: { id: number; name: string; sprite: string }[];
  moves: { name: string; label: string }[];
}

const route = useRoute();
const type = await usePageData<TypeData>(`/api/types/${encodeURIComponent(String(route.params.name))}`);
useHead({ title: () => type.value.label });
</script>

<template>
  <div class="stack">
    <h1>{{ type.label }}</h1>
    <PageSection title="Damage relations">
      <dl class="relations">
        <div v-for="r in type.relations" :key="r.label">
          <dt>{{ r.label }}</dt>
          <dd>
            <span v-if="r.types.length" class="badges">
              <TypeBadge v-for="t in r.types" :key="t.name" :type="t" link />
            </span>
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </PageSection>
    <PageSection title="Pokémon">
      <p class="count">{{ type.pokemon.length }} Pokémon</p>
      <CardGrid>
        <li v-for="p in type.pokemon" :key="p.id"><PokemonCard :pokemon="p" /></li>
      </CardGrid>
    </PageSection>
    <PageSection title="Moves">
      <p class="count">{{ type.moves.length }} moves</p>
      <ul class="link-columns">
        <li v-for="m in type.moves" :key="m.name">
          <NuxtLink :to="`/moves/${m.name}`">{{ m.label }}</NuxtLink>
        </li>
      </ul>
    </PageSection>
  </div>
</template>
