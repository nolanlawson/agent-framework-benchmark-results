<script setup lang="ts">
export interface EvolutionNode {
  name: string;
  label: string;
  children: EvolutionNode[];
}
defineProps<{ nodes: EvolutionNode[] }>();
</script>

<template>
  <ul class="evolution">
    <li v-for="node in nodes" :key="node.name">
      <NuxtLink :to="`/pokemon/${node.name}`">{{ node.label }}</NuxtLink>
      <EvolutionList v-if="node.children.length" :nodes="node.children" />
    </li>
  </ul>
</template>
