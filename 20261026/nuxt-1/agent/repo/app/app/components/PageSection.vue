<script setup lang="ts">
defineProps<{ title: string }>()
const headingId = useId()
</script>

<template>
  <section class="panel" :aria-labelledby="headingId">
    <h2 :id="headingId" class="panel__title">{{ title }}</h2>
    <slot />
  </section>
</template>
