<script setup lang="ts">
const types = await usePageData<{ name: string; label: string }[]>('/api/types');
useHead({ title: 'Types' });
</script>

<template>
  <div>
    <h1>Types</h1>
    <ul class="type-grid">
      <li v-for="t in types" :key="t.name">
        <NuxtLink :to="`/types/${t.name}`" class="type-tile" :style="{ '--badge-bg': `var(--type-${t.name})` }">
          {{ t.label }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
