<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
const heading = computed(() => (notFound.value ? 'Not found' : 'Something went wrong'))

useHead({ title: heading, titleTemplate: pageTitle })
</script>

<template>
  <AppHeader />
  <main class="container page">
    <h1>{{ heading }}</h1>
    <p v-if="!notFound">The Pokédex couldn't load this page. Please try again in a moment.</p>
    <p><NuxtLink to="/">Back to the Pokédex</NuxtLink></p>
  </main>
  <AppFooter />
</template>
