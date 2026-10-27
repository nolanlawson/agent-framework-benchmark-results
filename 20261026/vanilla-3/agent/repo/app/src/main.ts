import './tokens.css';
import './style.css';
import { route, startRouter } from './router';
import { homePage } from './pages/home';
import { pokemonPage } from './pages/pokemon';
import { abilityPage, movePage, typePage, typesPage } from './pages/details';

route(/^\/$/, homePage);
route(/^\/pokemon\/([^/]+)$/, pokemonPage);
route(/^\/moves\/([^/]+)$/, movePage);
route(/^\/abilities\/([^/]+)$/, abilityPage);
route(/^\/types$/, typesPage);
route(/^\/types\/([^/]+)$/, typePage);

startRouter();
