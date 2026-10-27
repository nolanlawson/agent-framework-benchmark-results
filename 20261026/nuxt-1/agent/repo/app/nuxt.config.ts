// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  css: ['~/assets/tokens.css', '~/assets/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  // All data is fetched from the API at request time; nothing is prerendered.
  nitro: { prerender: { crawlLinks: false, routes: [] } },
  experimental: { payloadExtraction: false },
})
