<script setup lang="ts">
defineProps<{ external?: boolean }>();
</script>

<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <NuxtLink to="/" class="site-header__home" :external="external">Pokédex</NuxtLink>
      <nav aria-label="Main">
        <ul class="site-nav">
          <li><NuxtLink to="/" :external="external">Pokémon</NuxtLink></li>
          <li><NuxtLink to="/types" :external="external">Types</NuxtLink></li>
        </ul>
      </nav>
    </div>
  </header>
</template>
