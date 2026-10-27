<script setup lang="ts">
const route = useRoute()
const name = computed(() => String(route.params.name))
const { data, error } = await useFetch(() => `/api/abilities/${encodeURIComponent(name.value)}`)
useHead({ title: () => data.value?.label ?? '' })
</script>

<template>
  <NotFound v-if="error?.statusCode === 404" />
  <p v-else-if="error">This ability could not be loaded. Please try again.</p>
  <template v-else-if="data">
    <h1>{{ data.label }}</h1>

    <PageSection title="Effect">
      <p>{{ display(data.effect) }}</p>
    </PageSection>

    <PageSection title="Pokémon">
      <p class="count">{{ data.pokemon.length }} Pokémon</p>
      <CardList :cards="data.pokemon" />
    </PageSection>
  </template>
</template>
