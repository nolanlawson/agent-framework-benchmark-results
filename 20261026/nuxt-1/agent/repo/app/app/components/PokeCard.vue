<script setup lang="ts">
import type { PokemonCard } from '#shared/types'

defineProps<{ pokemon: PokemonCard }>()
</script>

<template>
  <NuxtLink :to="`/pokemon/${pokemon.name}`" class="card">
    <img class="card__sprite" :src="pokemon.sprite" alt="" width="96" height="96" loading="lazy" decoding="async">
    <span class="card__dex">{{ dexNumber(pokemon.id) }}</span>
    <span class="card__name">{{ pokemon.label }}</span>
    <span v-if="pokemon.types?.length" class="card__types">
      <TypeBadge v-for="type in pokemon.types" :key="type.name" :type="type" />
    </span>
    <span v-if="pokemon.hidden" class="card__note">Hidden ability</span>
  </NuxtLink>
</template>
