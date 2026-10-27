<script setup lang="ts">
defineProps<{ type: TypeRef; link?: boolean }>()
</script>

<template>
  <NuxtLink v-if="link" :to="`/types/${type.name}`" class="type-badge" :style="{ '--type-color': `var(--type-${type.name})` }">
    {{ type.label }}
  </NuxtLink>
  <span v-else class="type-badge" :style="{ '--type-color': `var(--type-${type.name})` }">{{ type.label }}</span>
</template>
