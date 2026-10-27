<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} – Pokédex` : 'Pokédex'),
});
</script>

<template>
  <SiteHeader />
  <main class="container main">
    <NuxtPage :page-key="(route) => route.path" />
  </main>
  <SiteFooter />
</template>
