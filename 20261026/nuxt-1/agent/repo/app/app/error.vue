<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const heading = computed(() => (props.error.statusCode === 404 ? 'Not found' : 'Something went wrong'))
useHead({ titleTemplate: siteTitle, title: heading })

// Leave the error state when the user follows any link.
const route = useRoute()
watch(() => route.fullPath, () => clearError())
</script>

<template>
  <NuxtLayout>
    <h1>{{ heading }}</h1>
    <p><NuxtLink to="/">Back to the Pokédex</NuxtLink></p>
  </NuxtLayout>
</template>
