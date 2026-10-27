import type { TypeRef } from '#shared/types'

export default defineEventHandler(async (): Promise<TypeRef[]> => (await getIndex()).types)
