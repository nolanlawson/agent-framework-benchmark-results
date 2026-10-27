import { html } from '@gracile/gracile/server-html';

const SITE_NAME = 'Pokédex';

export const document = (props: { title?: string | null }) => html`
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<link rel="icon" href="data:," />
			<link rel="stylesheet" href=${new URL('./styles/global.css', import.meta.url).pathname} />
			<title>${props.title ? `${props.title} – ${SITE_NAME}` : SITE_NAME}</title>
		</head>

		<body>
			<header class="site-header">
				<div class="wrap">
					<a class="brand" href="/">Pokédex</a>
					<nav class="site-nav" aria-label="Main">
						<ul>
							<li><a href="/">Pokémon</a></li>
							<li><a href="/types">Types</a></li>
						</ul>
					</nav>
				</div>
			</header>

			<main class="wrap">
				<route-template-outlet></route-template-outlet>
			</main>

			<footer class="site-footer">
				<p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
			</footer>
		</body>
	</html>
`;
