<script setup lang="ts">
import type { AbilityDetail } from '#shared/types'

const route = useRoute()
const ability = await usePageData<AbilityDetail>(`/api/abilities/${encodeURIComponent(String(route.params.name))}`)
useHead({ title: () => ability.value.label })
</script>

<template>
  <div>
    <h1>{{ ability.label }}</h1>
    <PageSection title="Effect">
      <p>{{ ability.effect }}</p>
    </PageSection>
    <PageSection title="Pokémon">
      <p class="count">{{ ability.pokemon.count }} Pokémon</p>
      <CardGrid :pokemon="ability.pokemon.results" />
    </PageSection>
  </div>
</template>
