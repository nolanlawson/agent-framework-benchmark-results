export default defineEventHandler(async () => {
  const types = await getTypes()
  return types.map(({ name, label }) => ({ name, label }))
})
