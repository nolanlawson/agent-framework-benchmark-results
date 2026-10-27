<script setup lang="ts">
import type { TypeRef } from '#shared/types/pokedex'

const props = defineProps<{ id: number; name: string; types?: TypeRef[]; hidden?: boolean }>()
const sprite = computed(() => `${useRuntimeConfig().public.apiBase}/media/sprites/pokemon/${props.id}.png`)
</script>

<template>
  <NuxtLink :to="`/pokemon/${name}`" class="card">
    <img class="card__sprite" :src="sprite" alt="" width="96" height="96" loading="lazy" decoding="async" />
    <span class="card__dex">{{ dexNumber(id) }}</span>
    <span class="card__name">{{ humanize(name) }}</span>
    <span v-if="types?.length" class="card__types">
      <TypeBadge v-for="type in types" :key="type.name" :type="type" />
    </span>
    <span v-if="hidden" class="card__note">Hidden ability</span>
  </NuxtLink>
</template>
