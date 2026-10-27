<script setup lang="ts">
import type { TypeDetail } from '#shared/types'

const route = useRoute()
const type = await usePageData<TypeDetail>(`/api/types/${encodeURIComponent(String(route.params.name))}`)
useHead({ title: () => type.value.label })
</script>

<template>
  <div>
    <h1>{{ type.label }}</h1>
    <PageSection title="Damage relations">
      <dl class="relations">
        <div v-for="r in type.relations" :key="r.key">
          <dt>{{ r.label }}</dt>
          <dd>
            <ul v-if="r.types.length" class="badges">
              <li v-for="t in r.types" :key="t.name"><TypeBadge :type="t" link /></li>
            </ul>
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </PageSection>
    <PageSection title="Pokémon">
      <p class="count">{{ type.pokemon.count }} Pokémon</p>
      <CardGrid :pokemon="type.pokemon.results" />
    </PageSection>
    <PageSection title="Moves">
      <p class="count">{{ type.moves.length }} moves</p>
      <ul class="link-columns">
        <li v-for="m in type.moves" :key="m.name"><NuxtLink :to="`/moves/${m.name}`">{{ m.label }}</NuxtLink></li>
      </ul>
    </PageSection>
  </div>
</template>
