<script setup lang="ts">
import type { MoveDetail } from '#shared/types'

const route = useRoute()
const move = await usePageData<MoveDetail>(`/api/moves/${encodeURIComponent(String(route.params.name))}`)
useHead({ title: () => move.value.label })
</script>

<template>
  <div>
    <h1>{{ move.label }}</h1>
    <dl class="panel facts">
      <div>
        <dt>Type</dt>
        <dd><TypeBadge v-if="move.type" :type="move.type" link /><template v-else>{{ MISSING }}</template></dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{{ orMissing(move.category) }}</dd>
      </div>
      <div>
        <dt>Power</dt>
        <dd>{{ orMissing(move.power) }}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{{ orMissing(move.accuracy) }}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{{ orMissing(move.pp) }}</dd>
      </div>
    </dl>
    <PageSection title="Effect">
      <p>{{ move.effect }}</p>
    </PageSection>
    <PageSection title="Learned by">
      <p class="count">{{ move.learnedBy.count }} Pokémon</p>
      <CardGrid :pokemon="move.learnedBy.results" />
    </PageSection>
  </div>
</template>
