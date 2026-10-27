<script setup lang="ts">
import type { TypeRef } from '#shared/types/pokedex'

const props = defineProps<{ type: TypeRef; link?: boolean }>()
const style = computed(() => ({ backgroundColor: `var(--type-${props.type.name}, var(--color-text-muted))` }))
</script>

<template>
  <NuxtLink v-if="link" :to="`/types/${type.name}`" class="type-badge" :style="style">{{ type.label }}</NuxtLink>
  <span v-else class="type-badge" :style="style">{{ type.label }}</span>
</template>
