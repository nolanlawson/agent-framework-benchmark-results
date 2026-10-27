<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} – Pokédex` : 'Pokédex'),
})
</script>

<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <NuxtLink to="/" class="site-header__brand">Pokédex</NuxtLink>
      <nav aria-label="Main" class="site-header__nav">
        <NuxtLink to="/">Pokémon</NuxtLink>
        <NuxtLink to="/types">Types</NuxtLink>
      </nav>
    </div>
  </header>
  <main class="container site-main">
    <NuxtPage />
  </main>
  <footer class="site-footer">
    <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
  </footer>
</template>
