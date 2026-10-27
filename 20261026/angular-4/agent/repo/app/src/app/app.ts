import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="site-header">
      <div class="container site-header-inner">
        <a class="site-logo" routerLink="/">Pokédex</a>
        <nav aria-label="Main">
          <ul class="site-nav" role="list">
            <li><a routerLink="/">Pokémon</a></li>
            <li><a routerLink="/types">Types</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main class="container site-main">
      <router-outlet />
    </main>
    <footer class="site-footer">
      <p class="container">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </p>
    </footer>
  `,
})
export class App {}
