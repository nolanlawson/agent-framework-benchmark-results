<script setup lang="ts">
defineProps<{ card: Card }>()
</script>

<template>
  <NuxtLink :to="`/pokemon/${card.name}`" class="card">
    <img :src="card.sprite" alt="" width="96" height="96" loading="lazy" decoding="async" class="card__sprite" />
    <span class="card__dex">{{ dexNumber(card.id) }}</span>
    <span class="card__name">{{ card.label }}</span>
    <TypeBadges v-if="card.types?.length" :types="card.types" class="card__types" />
    <span v-if="card.hidden" class="card__note">Hidden ability</span>
  </NuxtLink>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  height: 100%;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-align: center;
  text-decoration: none;
}

.card:hover {
  border-color: var(--color-link);
}

.card__sprite {
  width: var(--sprite-size);
  height: var(--sprite-size);
}

.card__dex {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.card__note {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.card__types {
  justify-content: center;
}
</style>
