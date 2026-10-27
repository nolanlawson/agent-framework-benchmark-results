<script setup lang="ts">
import type { MoveRow, MoveTable } from '#shared/types'

const props = defineProps<{ table: MoveTable }>()

type Key = 'level' | 'label' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
const columns = computed(() => {
  const all: { key: Key; label: string }[] = [
    { key: 'level', label: 'Level' },
    { key: 'label', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]
  return props.table.method === 'level-up' ? all : all.slice(1)
})

const sortKey = ref<Key | null>(null)
const sortDir = ref<'ascending' | 'descending'>('ascending')

function toggle(key: Key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'ascending' ? 'descending' : 'ascending'
  else {
    sortKey.value = key
    sortDir.value = 'ascending'
  }
}

const value = (row: MoveRow, key: Key) => (key === 'type' ? row.type?.label ?? null : row[key])

const rows = computed(() => {
  const key = sortKey.value
  if (!key) return props.table.rows
  const dir = sortDir.value === 'ascending' ? 1 : -1
  return [...props.table.rows].sort((a, b) => {
    const x = value(a, key)
    const y = value(b, key)
    // Missing values go last in both directions.
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return cmp * dir || a.label.localeCompare(b.label)
  })
})
</script>

<template>
  <div class="table-scroll">
    <table class="moves-table">
      <caption>{{ table.label }}</caption>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            :aria-sort="sortKey === col.key ? sortDir : undefined"
          >
            <button type="button" class="sort-button" @click="toggle(col.key)">
              {{ col.label }}<span v-if="sortKey === col.key" class="sort-indicator" aria-hidden="true">{{ sortDir === 'ascending' ? '▲' : '▼' }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.name}-${row.level}`">
          <td v-if="table.method === 'level-up'">{{ orMissing(row.level) }}</td>
          <td><NuxtLink :to="`/moves/${row.name}`">{{ row.label }}</NuxtLink></td>
          <td><TypeBadge v-if="row.type" :type="row.type" link /><template v-else>{{ MISSING }}</template></td>
          <td>{{ orMissing(row.category) }}</td>
          <td>{{ orMissing(row.power) }}</td>
          <td>{{ orMissing(row.accuracy) }}</td>
          <td>{{ orMissing(row.pp) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
