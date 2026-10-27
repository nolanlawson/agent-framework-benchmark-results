<script setup lang="ts">
interface AbilityPage {
  name: string
  title: string
  effect: string | null
  pokemon: Card[]
}

const route = useRoute()
const { data } = await usePageData<AbilityPage>(`/api/abilities/${encodeURIComponent(String(route.params.name))}`)

useHead({ title: () => data.value?.title })
</script>

<template>
  <main v-if="data" class="container page">
    <h1>{{ data.title }}</h1>

    <PageSection title="Effect">
      <p class="prose">{{ data.effect ?? MISSING }}</p>
    </PageSection>

    <PageSection title="Pokémon">
      <p class="count">{{ data.pokemon.length }} Pokémon</p>
      <CardList :cards="data.pokemon" />
    </PageSection>
  </main>
</template>
