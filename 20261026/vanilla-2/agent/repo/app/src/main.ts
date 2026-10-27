import './tokens.css';
import './styles.css';
import { route, start } from './router';
import { homePage } from './pages/home';
import { pokemonPage } from './pages/pokemon';
import { movePage } from './pages/move';
import { abilityPage } from './pages/ability';
import { typePage, typesPage } from './pages/types';

route(/^\/$/, homePage);
route(/^\/pokemon\/([^/]+)$/, pokemonPage);
route(/^\/moves\/([^/]+)$/, movePage);
route(/^\/abilities\/([^/]+)$/, abilityPage);
route(/^\/types$/, typesPage);
route(/^\/types\/([^/]+)$/, typePage);

start();
