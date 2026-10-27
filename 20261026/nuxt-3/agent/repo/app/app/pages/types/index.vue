<script setup lang="ts">
const { data: types } = await usePageData<TypeRef[]>('/api/types')

useHead({ title: 'Types' })
</script>

<template>
  <main class="container page">
    <h1>Types</h1>
    <ul class="type-grid">
      <li v-for="type in types" :key="type.name">
        <NuxtLink :to="`/types/${type.name}`" :style="{ '--type-color': `var(--type-${type.name})` }">{{ type.label }}</NuxtLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.type-grid a {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--type-color);
  color: var(--color-on-type);
  text-decoration: none;
}

.type-grid a:hover {
  text-decoration: underline;
}
</style>
