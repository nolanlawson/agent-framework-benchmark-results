import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="site-header">
      <div class="site-header-inner">
        <a class="site-title" routerLink="/">Pokédex</a>
        <nav class="site-nav" aria-label="Main">
          <a routerLink="/">Pokémon</a>
          <a routerLink="/types">Types</a>
        </nav>
      </div>
    </header>
    <main class="site-main">
      <router-outlet />
    </main>
    <footer class="site-footer">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  `,
  host: { class: 'app' },
})
export class App {
  constructor() {
    // Start each new page at the top. Query-only changes (filters, the moves' game) keep
    // the scroll position, and pages with a #fragment scroll to it themselves.
    const router = inject(Router);
    let previousPath = '';
    router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      const tree = router.parseUrl(event.urlAfterRedirects);
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      if (previousPath && path !== previousPath && !tree.fragment) window.scrollTo(0, 0);
      previousPath = path;
    });
  }
}
