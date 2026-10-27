<script setup lang="ts">
import type { EvolutionNode } from '#shared/types'

defineProps<{ nodes: EvolutionNode[] }>()
</script>

<template>
  <ul class="evolution">
    <li v-for="node in nodes" :key="node.name">
      <NuxtLink :to="`/pokemon/${node.name}`">{{ node.label }}</NuxtLink>
      <EvolutionTree v-if="node.children.length" :nodes="node.children" />
    </li>
  </ul>
</template>
