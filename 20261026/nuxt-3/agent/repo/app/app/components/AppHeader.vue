<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <NuxtLink to="/" class="site-header__home">Pokédex</NuxtLink>
      <nav aria-label="Main">
        <ul class="site-header__nav">
          <li><NuxtLink to="/">Pokémon</NuxtLink></li>
          <li><NuxtLink to="/types">Types</NuxtLink></li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: var(--header-height);
}

.site-header a {
  color: inherit;
  text-decoration: none;
}

.site-header a:hover {
  text-decoration: underline;
}

.site-header__home {
  font-size: var(--text-lg);
}

.site-header__nav {
  display: flex;
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
