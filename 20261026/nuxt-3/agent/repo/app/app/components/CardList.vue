<script setup lang="ts">
defineProps<{ cards: Card[] }>()
</script>

<template>
  <ul class="card-grid">
    <li v-for="card in cards" :key="card.id"><PokemonCard :card="card" /></li>
  </ul>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-min-width), 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
