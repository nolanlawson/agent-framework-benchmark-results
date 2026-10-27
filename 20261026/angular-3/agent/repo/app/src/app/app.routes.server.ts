import { RenderMode, ServerRoute } from '@angular/ssr';

// Every page shows live API data, so render on each request.
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];
