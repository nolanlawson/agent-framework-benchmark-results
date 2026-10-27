<script setup lang="ts">
const props = defineProps<{ type: { name: string; label: string }; link?: boolean }>();
const style = computed(() => ({ '--badge-bg': `var(--type-${props.type.name}, var(--color-text-muted))` }));
</script>

<template>
  <NuxtLink v-if="link" :to="`/types/${type.name}`" class="badge" :style="style">{{ type.label }}</NuxtLink>
  <span v-else class="badge" :style="style">{{ type.label }}</span>
</template>
