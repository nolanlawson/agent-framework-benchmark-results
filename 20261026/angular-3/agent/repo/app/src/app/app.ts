import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    // Scroll to the top when moving to another page, but not when only the query
    // changes (filters, pagination of the same list, game selection).
    const router = inject(Router);
    const window = inject(DOCUMENT).defaultView;
    let lastPath: string | null = null;
    router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const tree = router.parseUrl(e.urlAfterRedirects);
      const path = e.urlAfterRedirects.split(/[?#]/)[0];
      if (lastPath !== null && path !== lastPath && !tree.fragment) window?.scrollTo(0, 0);
      lastPath = path;
    });
  }
}
