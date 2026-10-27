<script setup lang="ts">
useHead({ title: 'Not found' })
const event = useRequestEvent()
if (event) setResponseStatus(event, 404)
</script>

<template>
  <h1>Not found</h1>
  <p><NuxtLink to="/">Back to the Pokédex</NuxtLink></p>
</template>
