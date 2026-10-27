import { html } from '@gracile/gracile/server-html';

import { pageTitle } from './lib/format.js';

export const document = (props: { url: URL; title?: string | null }) => html`
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>${pageTitle(props.title)}</title>
			<link rel="icon" href="data:," />
			<link rel="stylesheet" href=${new URL('./document.css', import.meta.url).pathname} />
		</head>

		<body>
			<header class="site-header">
				<div class="site-header__inner">
					<a class="site-header__home" href="/">Pokédex</a>
					<nav class="site-nav" aria-label="Main">
						<ul>
							<li><a href="/">Pokémon</a></li>
							<li><a href="/types">Types</a></li>
						</ul>
					</nav>
				</div>
			</header>

			<main class="site-main">
				<route-template-outlet></route-template-outlet>
			</main>

			<footer class="site-footer">
				<p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
			</footer>
		</body>
	</html>
`;
