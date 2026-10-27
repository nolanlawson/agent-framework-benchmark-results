<script setup lang="ts">
useHead({ title: 'Types' })
const { data, error } = await useFetch('/api/types')
</script>

<template>
  <h1>Types</h1>
  <p v-if="error">The types could not be loaded. Please try again.</p>
  <ul v-else class="type-grid">
    <li v-for="type in data" :key="type.name">
      <NuxtLink :to="`/types/${type.name}`" class="type-tile" :style="{ backgroundColor: `var(--type-${type.name})` }">
        {{ type.label }}
      </NuxtLink>
    </li>
  </ul>
</template>
