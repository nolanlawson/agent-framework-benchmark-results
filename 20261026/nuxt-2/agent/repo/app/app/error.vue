<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
useHead({ title: () => (notFound.value ? 'Not found' : 'Something went wrong') })
</script>

<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <a href="/" class="site-header__brand">Pokédex</a>
      <nav aria-label="Main" class="site-header__nav">
        <a href="/">Pokémon</a>
        <a href="/types">Types</a>
      </nav>
    </div>
  </header>
  <main class="container site-main">
    <h1>{{ notFound ? 'Not found' : 'Something went wrong' }}</h1>
    <p><a href="/">Back to the Pokédex</a></p>
  </main>
  <footer class="site-footer">
    <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
  </footer>
</template>
