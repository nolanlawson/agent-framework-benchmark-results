<script setup lang="ts">
import type { TypeRef } from '#shared/types'

const props = defineProps<{ type: TypeRef; link?: boolean; size?: 'sm' | 'md' }>()
const style = computed(() => ({ '--badge-bg': `var(--type-${props.type.name}, var(--color-text-muted))` }))
</script>

<template>
  <NuxtLink v-if="link" :to="`/types/${type.name}`" class="badge" :class="size === 'md' && 'badge--md'" :style="style">{{ type.label }}</NuxtLink>
  <span v-else class="badge" :class="size === 'md' && 'badge--md'" :style="style">{{ type.label }}</span>
</template>
