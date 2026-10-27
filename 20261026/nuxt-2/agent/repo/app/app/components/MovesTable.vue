<script setup lang="ts">
import type { MoveRow } from '#shared/types/pokedex'

type Key = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
type Direction = 'ascending' | 'descending'

const props = defineProps<{ label: string; rows: MoveRow[]; showLevel: boolean }>()

const columns = computed(() => {
  const all: { key: Key; label: string }[] = [
    { key: 'level', label: 'Level' },
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]
  return props.showLevel ? all : all.slice(1)
})

const sortKey = ref<Key | null>(null)
const direction = ref<Direction>('ascending')

function toggle(key: Key) {
  if (sortKey.value === key) {
    direction.value = direction.value === 'ascending' ? 'descending' : 'ascending'
  } else {
    sortKey.value = key
    direction.value = 'ascending'
  }
}

function value(row: MoveRow, key: Key): string | number | null {
  switch (key) {
    case 'level':
      return row.level
    case 'move':
      return row.label
    case 'type':
      return row.type?.label ?? null
    case 'category':
      return row.category
    default:
      return row[key]
  }
}

const sortedRows = computed(() => {
  const key = sortKey.value
  if (!key) return props.rows
  const sign = direction.value === 'ascending' ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const va = value(a, key)
    const vb = value(b, key)
    // Missing values sort last in both directions.
    if (va === null || vb === null) {
      if (va === vb) return a.label.localeCompare(b.label)
      return va === null ? 1 : -1
    }
    const diff = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sign * diff || a.label.localeCompare(b.label)
  })
})
</script>

<template>
  <div class="table-scroll">
    <table class="moves-table">
      <caption>{{ label }}</caption>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            :aria-sort="sortKey === column.key ? direction : undefined"
          >
            <button type="button" class="sort-button" @click="toggle(column.key)">
              {{ column.label }}<span v-if="sortKey === column.key" class="sort-indicator" aria-hidden="true">{{
                direction === 'ascending' ? '▲' : '▼'
              }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in sortedRows" :key="`${row.name}:${row.level}`">
          <td v-if="showLevel">{{ display(row.level) }}</td>
          <td><NuxtLink :to="`/moves/${row.name}`">{{ row.label }}</NuxtLink></td>
          <td><TypeBadge v-if="row.type" :type="row.type" link /><template v-else>—</template></td>
          <td>{{ display(row.category) }}</td>
          <td>{{ display(row.power) }}</td>
          <td>{{ display(row.accuracy) }}</td>
          <td>{{ display(row.pp) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
