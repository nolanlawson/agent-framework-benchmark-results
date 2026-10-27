<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
const notFound = computed(() => props.error.statusCode === 404);
const heading = computed(() => (notFound.value ? 'Not found' : 'Something went wrong'));
useHead({ title: () => `${heading.value} – Pokédex` });

const goHome = () => clearError({ redirect: '/' });
</script>

<template>
  <SiteHeader external />
  <main class="container main">
    <h1>{{ heading }}</h1>
    <p><a href="/" @click.prevent="goHome">Back to the Pokédex</a></p>
  </main>
  <SiteFooter />
</template>
