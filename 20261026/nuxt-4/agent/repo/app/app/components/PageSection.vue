<script setup lang="ts">
const props = defineProps<{ title: string; id?: string }>();
const headingId = useId();
</script>

<template>
  <section :id="props.id" class="panel" :aria-labelledby="headingId">
    <h2 :id="headingId" class="panel__title">{{ title }}</h2>
    <slot />
  </section>
</template>
