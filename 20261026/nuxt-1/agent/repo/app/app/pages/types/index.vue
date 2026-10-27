<script setup lang="ts">
import type { TypeRef } from '#shared/types'

useHead({ title: 'Types' })
const types = await usePageData<TypeRef[]>('/api/types')
</script>

<template>
  <div>
    <h1>Types</h1>
    <ul class="type-list">
      <li v-for="t in types" :key="t.name">
        <NuxtLink :to="`/types/${t.name}`" class="type-tile" :style="{ '--badge-bg': `var(--type-${t.name})` }">{{ t.label }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
