<script setup lang="ts">
import type { Card } from '#shared/types/pokedex'

defineProps<{ cards: Card[] }>()
</script>

<template>
  <ul class="card-grid">
    <li v-for="card in cards" :key="card.id">
      <PokemonCard :id="card.id" :name="card.name" :hidden="card.hidden" />
    </li>
  </ul>
</template>
