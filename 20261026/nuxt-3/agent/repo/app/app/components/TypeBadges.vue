<script setup lang="ts">
defineProps<{ types: TypeRef[]; link?: boolean }>()
</script>

<template>
  <ul class="type-badges">
    <li v-for="type in types" :key="type.name"><TypeBadge :type="type" :link="link" /></li>
  </ul>
</template>
