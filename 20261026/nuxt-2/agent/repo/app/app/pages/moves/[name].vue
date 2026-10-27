<script setup lang="ts">
const route = useRoute()
const name = computed(() => String(route.params.name))
const { data, error } = await useFetch(() => `/api/moves/${encodeURIComponent(name.value)}`)
useHead({ title: () => data.value?.label ?? '' })
</script>

<template>
  <NotFound v-if="error?.statusCode === 404" />
  <p v-else-if="error">This move could not be loaded. Please try again.</p>
  <template v-else-if="data">
    <h1>{{ data.label }}</h1>
    <dl class="facts panel">
      <div>
        <dt>Type</dt>
        <dd><TypeBadge v-if="data.type" :type="data.type" link /><template v-else>—</template></dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{{ display(data.category) }}</dd>
      </div>
      <div>
        <dt>Power</dt>
        <dd>{{ display(data.power) }}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{{ display(data.accuracy) }}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{{ display(data.pp) }}</dd>
      </div>
    </dl>

    <PageSection title="Effect">
      <p>{{ display(data.effect) }}</p>
    </PageSection>

    <PageSection title="Learned by">
      <p class="count">{{ data.pokemon.length }} Pokémon</p>
      <CardList :cards="data.pokemon" />
    </PageSection>
  </template>
</template>
