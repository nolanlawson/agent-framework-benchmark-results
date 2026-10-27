import { html } from '@gracile/gracile/server-html';

export const SITE_NAME = 'Pokédex';

export function pageTitle(heading?: string | null): string {
	return heading ? `${heading} – ${SITE_NAME}` : SITE_NAME;
}

export const document = (props: { url: URL; title?: string | null }) => html`
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="color-scheme" content="light" />

			<link rel="stylesheet" href=${new URL('./styles/tokens.css', import.meta.url).pathname} />
			<link rel="stylesheet" href=${new URL('./styles/document.css', import.meta.url).pathname} />

			<title>${pageTitle(props.title)}</title>
			<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		</head>

		<body>
			<header class="site-header">
				<div class="site-header-inner">
					<a class="site-name" href="/">${SITE_NAME}</a>
					<nav aria-label="Main">
						<ul role="list">
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
