<script setup lang="ts">
const props = defineProps<{ table: MoveTable }>()

type Key = 'level' | 'label' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
type Direction = 'ascending' | 'descending'

const columns = computed(() => [
  ...(props.table.method === 'level-up' ? [{ key: 'level' as Key, label: 'Level' }] : []),
  { key: 'label' as Key, label: 'Move' },
  { key: 'type' as Key, label: 'Type' },
  { key: 'category' as Key, label: 'Category' },
  { key: 'power' as Key, label: 'Power' },
  { key: 'accuracy' as Key, label: 'Accuracy' },
  { key: 'pp' as Key, label: 'PP' },
])

const sort = ref<{ key: Key; direction: Direction } | null>(null)
const hydrated = useHydrated()

function sortValue(row: MoveRow, key: Key): string | number | null {
  return key === 'type' ? row.type.label : row[key]
}

// Sorting is stable, so ties keep the default order. Missing values always go last.
const rows = computed(() => {
  if (!sort.value) return props.table.rows
  const { key, direction } = sort.value
  const sign = direction === 'ascending' ? 1 : -1
  return [...props.table.rows].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1
    return sign * (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb)))
  })
})

function toggle(key: Key) {
  sort.value =
    sort.value?.key === key
      ? { key, direction: sort.value.direction === 'ascending' ? 'descending' : 'ascending' }
      : { key, direction: 'ascending' }
}

const show = (value: string | number | null) => value ?? MISSING
</script>

<template>
  <div class="move-table">
    <table>
      <caption>{{ table.label }}</caption>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            :aria-sort="sort?.key === column.key ? sort.direction : undefined"
          >
            <button type="button" :disabled="!hydrated" @click="toggle(column.key)">
              {{ column.label
              }}<span v-if="sort?.key === column.key" class="move-table__arrow" aria-hidden="true">{{
                sort.direction === 'ascending' ? '▲' : '▼'
              }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="`${row.name}-${row.level}-${i}`">
          <td v-if="table.method === 'level-up'">{{ show(row.level) }}</td>
          <td><NuxtLink :to="`/moves/${row.name}`">{{ row.label }}</NuxtLink></td>
          <td><TypeBadge :type="row.type" link /></td>
          <td>{{ show(row.category) }}</td>
          <td>{{ show(row.power) }}</td>
          <td>{{ show(row.accuracy) }}</td>
          <td>{{ show(row.pp) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.move-table {
  overflow-x: auto;
}

.move-table + .move-table {
  margin-top: var(--space-5);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

caption {
  padding-bottom: var(--space-2);
  font-size: var(--text-base);
  text-align: left;
}

th {
  padding: 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: var(--weight-normal);
  text-align: left;
  white-space: nowrap;
}

th button {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: inherit;
  cursor: pointer;
}

th button:disabled {
  cursor: default;
}

th[aria-sort] {
  color: var(--color-text);
}

.move-table__arrow {
  margin-left: var(--space-1);
  font-size: 0.625rem;
}

td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
</style>
