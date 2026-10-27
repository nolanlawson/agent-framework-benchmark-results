<template>
  <div class="site">
    <header class="site-header">
      <div class="container site-header__inner">
        <NuxtLink to="/" class="site-header__home">Pokédex</NuxtLink>
        <nav aria-label="Main">
          <ul class="site-nav">
            <li><NuxtLink to="/">Pokémon</NuxtLink></li>
            <li><NuxtLink to="/types">Types</NuxtLink></li>
          </ul>
        </nav>
      </div>
    </header>
    <main class="container site-main">
      <slot />
    </main>
    <footer class="site-footer">
      <p class="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  </div>
</template>
