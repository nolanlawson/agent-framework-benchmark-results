import { serve } from '@hono/node-server'
import { Hono, type Context } from 'hono'
import { assets } from './assets.js'
import { renderer } from './components.js'
import { englishName, getAbility, getMove, getType } from './data.js'
import { moveTables, parseSort } from './moves.js'
import { HomePage, Results, homeUrl, parseHomeQuery } from './pages/home.js'
import { AbilityPage, ErrorPage, MovePage, NotFoundPage, TypePage, TypesPage } from './pages/details.js'
import { MoveTableView, MoveTables, PokemonPage, loadPokemon, resolveGame } from './pages/pokemon.js'
import { withQuery } from './util.js'

const app = new Hono()

/** True for htmx requests that swap a fragment into the given target (not history restores). */
const isFragment = (c: Context, target: string) =>
  c.req.header('HX-Request') === 'true' &&
  !c.req.header('HX-History-Restore-Request') &&
  c.req.header('HX-Target') === target

app.get('/static/:file', (c) => {
  const asset = assets.get(c.req.param('file'))
  if (!asset) return c.notFound()
  return c.body(asset.body, 200, {
    'Content-Type': asset.type,
    'Cache-Control': c.req.query('v') === asset.hash ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
})

app.use(async (c, next) => {
  await next()
  if (c.res.headers.get('Content-Type')?.startsWith('text/html')) c.header('Vary', 'HX-Request, HX-Target')
})

app.use(renderer)

app.get('/', async (c) => {
  const query = parseHomeQuery(c.req.query())
  if (isFragment(c, 'results')) {
    c.header('HX-Push-Url', homeUrl(query))
    return c.html(<Results query={query} />)
  }
  return c.render(<HomePage query={query} />, {})
})

app.get('/pokemon/:name', async (c) => {
  const data = await loadPokemon(c.req.param('name'))
  if (!data) return c.notFound()
  return c.render(<PokemonPage data={data} requestedGame={c.req.query('game')} />, { title: data.title })
})

// htmx fragment: the move tables for another game.
app.get('/pokemon/:name/moves', async (c) => {
  const data = await loadPokemon(c.req.param('name'))
  if (!data) return c.notFound()
  const { game } = await resolveGame(data.pokemon, c.req.query('game'))
  const page = withQuery(`/pokemon/${data.species.name}`, { game })
  if (!isFragment(c, 'moves-body')) return c.redirect(page)
  c.header('HX-Push-Url', page)
  return c.html(<MoveTables pokemon={data.pokemon} species={data.species.name} game={game} />)
})

// htmx fragment: one move table, sorted by a column.
app.get('/pokemon/:name/moves/table', async (c) => {
  const data = await loadPokemon(c.req.param('name'))
  if (!data) return c.notFound()
  const { game } = await resolveGame(data.pokemon, c.req.query('game'))
  const tables = game ? await moveTables(data.pokemon, game) : []
  const table = tables.find((t) => t.method === c.req.query('method'))
  if (!game || !table || c.req.header('HX-Request') !== 'true') {
    return c.redirect(withQuery(`/pokemon/${data.species.name}`, { game }))
  }
  const sort = parseSort(c.req.query('sort'), c.req.query('dir'))
  return c.html(<MoveTableView table={table} species={data.species.name} game={game} sort={sort} />)
})

app.get('/moves/:name', async (c) => {
  const move = await getMove(c.req.param('name'))
  if (!move) return c.notFound()
  return c.render(<MovePage move={move} />, { title: englishName(move) })
})

app.get('/abilities/:name', async (c) => {
  const ability = await getAbility(c.req.param('name'))
  if (!ability) return c.notFound()
  return c.render(<AbilityPage ability={ability} />, { title: englishName(ability) })
})

app.get('/types', (c) => c.render(<TypesPage />, { title: 'Types' }))

app.get('/types/:name', async (c) => {
  const type = await getType(c.req.param('name'))
  if (!type) return c.notFound()
  return c.render(<TypePage type={type} />, { title: englishName(type) })
})

app.notFound((c) => {
  c.status(404)
  return c.render(<NotFoundPage />, { title: 'Not found' })
})

app.onError((err, c) => {
  console.error(err)
  c.status(500)
  return c.render(<ErrorPage />, { title: 'Something went wrong' })
})

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex listening on http://localhost:${info.port}`)
})
