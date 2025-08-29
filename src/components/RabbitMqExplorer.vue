<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-select
          v-model="selectedRabbitMq"
          :items="rabbitMqs"
          item-title="name"
          item-value="name"
          label="Select RabbitMQ Instance"
          :disabled="loading"
          hide-details
        ></v-select>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center">
          <v-radio-group v-model="entityTypeFilter" inline class="mr-4">
            <v-radio label="Exchanges" value="exchanges"></v-radio>
            <v-radio label="Queues" value="queues"></v-radio>
          </v-radio-group>
          <v-text-field
            v-model="nameFilter"
            :label="entityTypeFilter === 'exchanges' ? 'Filter by exchange name...' : 'Filter by queue name...'"
            dense
            clearable
            hide-details
            class="flex-grow-1"
            :disabled="!selectedRabbitMq"
          ></v-text-field>
          <v-btn color="primary" @click="openCreateDialog" class="ml-4" :disabled="!selectedRabbitMq">
            Create New
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-alert v-if="error" type="error" :text="error" class="mb-4"></v-alert>

        <v-card v-if="entityTypeFilter === 'queues'">
          <v-card-title>Queues ({{ totalQueues.toLocaleString() }})</v-card-title>
          <v-data-table-server
            :headers="queueHeaders"
            :items="queues"
            :items-length="totalQueues"
            :loading="loading"
            v-model:page="currentPage"
            v-model:items-per-page="pageSize"
            @update:options="fetchData"
            class="elevation-1"
          >
            <template v-slot:item.actions="{ item }">
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-fire" size="small" @click="selectedRabbitMq && purgeQueue(item)" :disabled="item.messages === 0" class="mr-2">
                  </v-btn>
                </template>
                <span>Purge Messages</span>
              </v-tooltip>
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-delete-forever" size="small" color="error" @click="selectedRabbitMq && deleteQueue(item)"></v-btn>
                </template>
                <span>Delete Queue</span>
              </v-tooltip>
            </template>
          </v-data-table-server>
        </v-card>

        <v-card v-if="entityTypeFilter === 'exchanges'">
          <v-card-title>Exchanges ({{ totalExchanges.toLocaleString() }})</v-card-title>
          <v-data-table-server
            :headers="exchangeHeaders"
            :items="exchanges"
            :items-length="totalExchanges"
            :loading="loading"
            v-model:page="currentPage"
            v-model:items-per-page="pageSize"
            @update:options="fetchData"
            class="elevation-1"
          >
            <template v-slot:item.actions="{ item }">
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-delete-forever" size="small" color="error" @click="selectedRabbitMq && deleteExchange(item)"></v-btn>
                </template>
                <span>Delete Exchange</span>
              </v-tooltip>
            </template>
          </v-data-table-server>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="createDialog" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">Create New Entity</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-radio-group v-model="newEntity.type" inline @update:modelValue="newEntity.name = ''">
              <v-radio label="Queue" value="queue"></v-radio>
              <v-radio label="Exchange" value="exchange"></v-radio>
            </v-radio-group>
            <v-text-field
              v-model="newEntity.name"
              :label="getNewEntityNameLabel()"
              required
              class="mt-2"
            />
          </v-container>
          <small>*indicates required field</small>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" text @click="closeCreateDialog" :disabled="creating">Cancel</v-btn>
          <v-btn color="blue-darken-1" text @click="handleCreateEntity" :loading="creating" :disabled="creating">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { RabbitMqQueue, RabbitMqExchange } from '@/services/models';
import {
  getRabbitMqs,
  fetchData as apiFetchData,
  createEntity as apiCreateEntity,
  purgeRabbitMqQueue as apiPurgeQueue,
  deleteRabbitMqQueue as apiDeleteQueue,
  deleteRabbitMqExchange as apiDeleteExchange,
} from '@/services/api';

// Refs
const rabbitMqs = ref<{name: string}[]>([]);
const selectedRabbitMq = ref<string | null>(null);
const queues = ref<RabbitMqQueue[]>([]);
const totalQueues = ref(0);
const exchanges = ref<RabbitMqExchange[]>([]);
const totalExchanges = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);
const entityTypeFilter = ref<'exchanges' | 'queues'>('exchanges');
const nameFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(10); // Default items per page
const sortBy = ref<any[]>([]);
const createDialog = ref(false);
const creating = ref(false);
const newEntity = ref({
  type: 'queue',
  name: ''
});

// Headers
const queueHeaders: any = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Messages', key: 'messages', sortable: true },
  { title: 'Consumers', key: 'consumers', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end'  },
];

const exchangeHeaders: any = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Durable', key: 'durable', sortable: true },
  { title: 'Auto Delete', key: 'auto_delete', sortable: true },
  { title: 'Internal', key: 'internal', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end'  },
];

// Methods
async function fetchData({ page, itemsPerPage, sortBy: newSortBy }: { page: number, itemsPerPage: number, sortBy: any[] }) {
  if (!selectedRabbitMq.value) {
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    // Update local pagination refs
    currentPage.value = page;
    pageSize.value = itemsPerPage;
    sortBy.value = newSortBy;

    const data = await apiFetchData(
      selectedRabbitMq.value,
      entityTypeFilter.value,
      page,
      itemsPerPage,
      nameFilter.value,
      '', // No subscription name filter for RabbitMQ
      sortBy.value
    );

    if (entityTypeFilter.value === 'queues') {
      queues.value = data.items;
      totalQueues.value = data.total;
    } else {
      exchanges.value = data.items;
      totalExchanges.value = data.total;
    }

  } catch (e: any) {
    console.error('Failed to fetch entities:', e);
    error.value = `Failed to fetch data: ${e.message}`;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const rmqs = await getRabbitMqs();
    rabbitMqs.value = rmqs;
    if (rmqs.length > 0) {
      selectedRabbitMq.value = rmqs[0].name;
    }
  } catch (e: any) {
    error.value = `Failed to fetch RabbitMQ list: ${e.message}`;
  }
});

watch([selectedRabbitMq, entityTypeFilter, nameFilter], () => {
  if (!selectedRabbitMq.value) return;
  currentPage.value = 1;
  fetchData({ page: currentPage.value, itemsPerPage: pageSize.value, sortBy: sortBy.value });
});

function openCreateDialog() {
  createDialog.value = true;
}

function closeCreateDialog() {
  createDialog.value = false;
  setTimeout(() => {
    newEntity.value = {
      type: 'queue',
      name: ''
    };
  }, 300);
}

async function handleCreateEntity() {
  creating.value = true;
  error.value = null;
  if (!selectedRabbitMq.value) {
    alert('Please select a RabbitMQ instance first.');
    creating.value = false;
    return;
  }
  try {
    const result = await apiCreateEntity(
      selectedRabbitMq.value,
      newEntity.value.type,
      newEntity.value.name,
      undefined
    );

    alert(result.message); // Success message
    closeCreateDialog();
    if (newEntity.value.type === 'queue') {
      entityTypeFilter.value = 'queues';
    } else {
      entityTypeFilter.value = 'exchanges';
    }
    fetchData({ page: 1, itemsPerPage: pageSize.value, sortBy: sortBy.value });

  } catch (e: any) {
    alert(`Creation failed: ${e.message}`);
  } finally {
    creating.value = false;
  }
}

function getNewEntityNameLabel() {
  switch(newEntity.value.type) {
    case 'queue': return 'New Queue Name*';
    case 'exchange': return 'New Exchange Name*';
    default: return 'Name*';
  }
}

// Action Methods
async function purgeQueue(queue: RabbitMqQueue) {
  if (!selectedRabbitMq.value) return;
  if (!confirm(`Are you sure you want to purge all messages from queue ${queue.name}? This action cannot be undone.`)) return;
  try {
    const result = await apiPurgeQueue(selectedRabbitMq.value, queue);
    alert(result.message);
    fetchData({ page: currentPage.value, itemsPerPage: pageSize.value, sortBy: sortBy.value });
  } catch (e: any) {
    error.value = `Failed to purge queue: ${e.message}`;
  }
}

async function deleteQueue(queue: RabbitMqQueue) {
  if (!selectedRabbitMq.value) return;
  if (!confirm(`Are you sure you want to DELETE queue ${queue.name}? This action cannot be undone.`)) return;
  try {
    const result = await apiDeleteQueue(selectedRabbitMq.value, queue);
    alert(result.message);
    fetchData({ page: currentPage.value, itemsPerPage: pageSize.value, sortBy: sortBy.value });
  } catch (e: any) {
    error.value = `Failed to delete queue: ${e.message}`;
  }
}

async function deleteExchange(exchange: RabbitMqExchange) {
  if (!selectedRabbitMq.value) return;
  if (!confirm(`Are you sure you want to DELETE exchange ${exchange.name}? This action cannot be undone.`)) return;
  try {
    const result = await apiDeleteExchange(selectedRabbitMq.value, exchange);
    alert(result.message);
    fetchData({ page: currentPage.value, itemsPerPage: pageSize.value, sortBy: sortBy.value });
  } catch (e: any) {
    error.value = `Failed to delete exchange: ${e.message}`;
  }
}
</script>

<style scoped>
.v-data-table-header__icon {
  display: none !important;
}
</style>