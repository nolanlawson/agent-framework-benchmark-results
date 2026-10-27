<script setup lang="ts">
interface MovePage {
  name: string
  title: string
  type: TypeRef
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string | null
  learnedBy: Card[]
}

const route = useRoute()
const { data } = await usePageData<MovePage>(`/api/moves/${encodeURIComponent(String(route.params.name))}`)

useHead({ title: () => data.value?.title })
</script>

<template>
  <main v-if="data" class="container page">
    <h1>{{ data.title }}</h1>

    <dl class="panel panel--compact facts">
      <div>
        <dt>Type</dt>
        <dd><TypeBadge :type="data.type" link /></dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{{ data.category ?? MISSING }}</dd>
      </div>
      <div>
        <dt>Power</dt>
        <dd>{{ data.power ?? MISSING }}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{{ data.accuracy ?? MISSING }}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{{ data.pp ?? MISSING }}</dd>
      </div>
    </dl>

    <PageSection title="Effect">
      <p class="prose">{{ data.effect ?? MISSING }}</p>
    </PageSection>

    <PageSection title="Learned by">
      <p class="count">{{ data.learnedBy.length }} Pokémon</p>
      <CardList :cards="data.learnedBy" />
    </PageSection>
  </main>
</template>
