<script setup lang="ts">
import type { PokemonCard } from '#shared/types'

defineProps<{ pokemon: PokemonCard[] }>()
</script>

<template>
  <ul class="card-grid">
    <li v-for="p in pokemon" :key="p.id">
      <PokeCard :pokemon="p" />
    </li>
  </ul>
</template>
