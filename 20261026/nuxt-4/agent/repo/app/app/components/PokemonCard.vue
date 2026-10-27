<script setup lang="ts">
defineProps<{
  pokemon: { id: number; name: string; sprite: string };
  types?: { name: string; label: string }[];
  note?: string;
}>();
</script>

<template>
  <NuxtLink :to="`/pokemon/${pokemon.name}`" class="card">
    <img class="card__sprite" :src="pokemon.sprite" alt="" width="96" height="96" loading="lazy" decoding="async" />
    <span class="card__number">{{ dexNumber(pokemon.id) }}</span>
    <span class="card__name">{{ humanize(pokemon.name) }}</span>
    <span v-if="types?.length" class="badges card__types">
      <TypeBadge v-for="t in types" :key="t.name" :type="t" />
    </span>
    <span v-if="note" class="card__note">{{ note }}</span>
  </NuxtLink>
</template>
