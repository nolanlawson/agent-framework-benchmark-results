<script setup lang="ts">
interface AbilityData {
  name: string;
  label: string;
  effect: string | null;
  pokemon: { id: number; name: string; sprite: string; hidden: boolean }[];
}

const route = useRoute();
const ability = await usePageData<AbilityData>(`/api/abilities/${encodeURIComponent(String(route.params.name))}`);
useHead({ title: () => ability.value.label });
</script>

<template>
  <div class="stack">
    <h1>{{ ability.label }}</h1>
    <PageSection title="Effect">
      <p>{{ orDash(ability.effect) }}</p>
    </PageSection>
    <PageSection title="Pokémon">
      <p class="count">{{ ability.pokemon.length }} Pokémon</p>
      <CardGrid>
        <li v-for="p in ability.pokemon" :key="p.id">
          <PokemonCard :pokemon="p" :note="p.hidden ? 'Hidden ability' : undefined" />
        </li>
      </CardGrid>
    </PageSection>
  </div>
</template>
