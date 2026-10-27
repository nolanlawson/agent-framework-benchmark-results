<script setup lang="ts">
const route = useRoute()
const name = computed(() => String(route.params.name))
const { data, error } = await useFetch(() => `/api/types/${encodeURIComponent(name.value)}`)
useHead({ title: () => data.value?.label ?? '' })
</script>

<template>
  <NotFound v-if="error?.statusCode === 404" />
  <p v-else-if="error">This type could not be loaded. Please try again.</p>
  <template v-else-if="data">
    <h1>{{ data.label }}</h1>

    <PageSection title="Damage relations">
      <dl class="relations">
        <div v-for="relation in data.relations" :key="relation.key">
          <dt>{{ relation.label }}</dt>
          <dd>
            <template v-if="relation.types.length">
              <TypeBadge v-for="type in relation.types" :key="type.name" :type="type" link />
            </template>
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </PageSection>

    <PageSection title="Pokémon">
      <p class="count">{{ data.pokemon.length }} Pokémon</p>
      <CardList :cards="data.pokemon" />
    </PageSection>

    <PageSection title="Moves">
      <p class="count">{{ data.moves.length }} moves</p>
      <ul class="link-columns">
        <li v-for="move in data.moves" :key="move.name">
          <NuxtLink :to="`/moves/${move.name}`">{{ move.label }}</NuxtLink>
        </li>
      </ul>
    </PageSection>
  </template>
</template>
