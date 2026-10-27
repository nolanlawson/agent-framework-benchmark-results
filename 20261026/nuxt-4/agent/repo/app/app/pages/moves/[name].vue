<script setup lang="ts">
interface MoveData {
  name: string;
  label: string;
  type: { name: string; label: string } | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  pokemon: { id: number; name: string; sprite: string }[];
}

const route = useRoute();
const move = await usePageData<MoveData>(`/api/moves/${encodeURIComponent(String(route.params.name))}`);
useHead({ title: () => move.value.label });
</script>

<template>
  <div class="stack">
    <h1>{{ move.label }}</h1>
    <div class="panel panel--compact">
      <dl class="facts">
        <div>
          <dt>Type</dt>
          <dd><TypeBadge v-if="move.type" :type="move.type" link /><template v-else>—</template></dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ orDash(move.category) }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ orDash(move.power) }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ orDash(move.accuracy) }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ orDash(move.pp) }}</dd>
        </div>
      </dl>
    </div>
    <PageSection title="Effect">
      <p>{{ orDash(move.effect) }}</p>
    </PageSection>
    <PageSection title="Learned by">
      <p class="count">{{ move.pokemon.length }} Pokémon</p>
      <CardGrid>
        <li v-for="p in move.pokemon" :key="p.id"><PokemonCard :pokemon="p" /></li>
      </CardGrid>
    </PageSection>
  </div>
</template>
