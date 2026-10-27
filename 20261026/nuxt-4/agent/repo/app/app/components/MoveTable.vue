<script setup lang="ts">
export interface MoveRow {
  key: string;
  level: number | null;
  name: string;
  label: string;
  type: { name: string; label: string } | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

const props = defineProps<{ caption: string; rows: MoveRow[]; showLevel?: boolean }>();

const columns = computed(() => {
  const all: { key: Column; label: string }[] = [
    { key: 'level', label: 'Level' },
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];
  return props.showLevel ? all : all.slice(1);
});

const sortKey = ref<Column | null>(null);
const sortDir = ref<Direction>('ascending');

function sortBy(key: Column) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'ascending' ? 'descending' : 'ascending';
  else {
    sortKey.value = key;
    sortDir.value = 'ascending';
  }
}

const value = (row: MoveRow, key: Column): string | number | null => {
  switch (key) {
    case 'level':
      return row.level;
    case 'move':
      return row.label;
    case 'type':
      return row.type?.label ?? null;
    default:
      return row[key];
  }
};

const compare = (a: string | number, b: string | number) =>
  typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));

const sorted = computed(() => {
  const rows = [...props.rows];
  const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);
  const key = sortKey.value;
  if (!key) {
    return props.showLevel ? rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || byName(a, b)) : rows.sort(byName);
  }
  const sign = sortDir.value === 'ascending' ? 1 : -1;
  return rows.sort((a, b) => {
    const va = value(a, key);
    const vb = value(b, key);
    // Missing values go last in both directions.
    if (va === null && vb === null) return byName(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    return sign * compare(va, vb) || byName(a, b);
  });
});
</script>

<template>
  <div class="table-wrap">
    <table class="moves-table">
      <caption>{{ caption }}</caption>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            :aria-sort="sortKey === col.key ? sortDir : undefined"
          >
            <button type="button" class="sort-button" @click="sortBy(col.key)">
              {{ col.label }}<span v-if="sortKey === col.key" class="sort-indicator" aria-hidden="true">{{ sortDir === 'ascending' ? '▲' : '▼' }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in sorted" :key="row.key">
          <td v-if="showLevel">{{ orDash(row.level) }}</td>
          <td><NuxtLink :to="`/moves/${row.name}`">{{ row.label }}</NuxtLink></td>
          <td><TypeBadge v-if="row.type" :type="row.type" link /><template v-else>—</template></td>
          <td>{{ orDash(row.category) }}</td>
          <td>{{ orDash(row.power) }}</td>
          <td>{{ orDash(row.accuracy) }}</td>
          <td>{{ orDash(row.pp) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
