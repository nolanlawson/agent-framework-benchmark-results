<script setup lang="ts">
defineProps<{ nodes: EvolutionNode[] }>()
</script>

<template>
  <ul>
    <li v-for="node in nodes" :key="node.name">
      <NuxtLink :to="`/pokemon/${node.name}`">{{ node.label }}</NuxtLink>
      <EvolutionTree v-if="node.children.length" :nodes="node.children" />
    </li>
  </ul>
</template>
