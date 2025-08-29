<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-select
          v-model="selectedKafka"
          :items="kafkas"
          item-title="name"
          item-value="name"
          label="Select Kafka Instance"
          :disabled="loading"
          hide-details
        ></v-select>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center">
          <v-radio-group v-model="entityTypeFilter" inline class="mr-4">
            <v-radio label="Topics" value="topics"></v-radio>
            <v-radio label="Consumer Groups" value="consumer-groups"></v-radio>
          </v-radio-group>
          <v-text-field
            v-model="nameFilter"
            :label="entityTypeFilter === 'topics' ? 'Filter by topic name...' : 'Filter by consumer group name...'"
            dense
            clearable
            hide-details
            class="flex-grow-1"
            :disabled="!selectedKafka"
          ></v-text-field>
          <v-btn color="primary" @click="openCreateDialog" class="ml-4" :disabled="!selectedKafka">
            Create New
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-alert v-if="error" type="error" :text="error" class="mb-4"></v-alert>

        <v-card v-if="entityTypeFilter === 'topics'">
          <v-card-title>Topics ({{ totalTopics.toLocaleString() }})</v-card-title>
          <v-data-table-server
            :headers="topicHeaders"
            :items="topics"
            :items-length="totalTopics"
            :loading="loading"
            v-model:page="currentPage"
            v-model:items-per-page="pageSize"
            @update:options="fetchData"
            class="elevation-1"
          >
            <template v-slot:item.actions="{ item }">
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-delete-forever" size="small" color="error" @click="selectedKafka && deleteTopic(item)"></v-btn>
                </template>
                <span>Delete Topic</span>
              </v-tooltip>
            </template>
          </v-data-table-server>
        </v-card>

        <v-card v-if="entityTypeFilter === 'consumer-groups'">
          <v-card-title>Consumer Groups ({{ totalConsumerGroups.toLocaleString() }})</v-card-title>
          <v-data-table-server
            :headers="consumerGroupHeaders"
            :items="consumerGroups"
            :items-length="totalConsumerGroups"
            :loading="loading"
            v-model:page="currentPage"
            v-model:items-per-page="pageSize"
            @update:options="fetchData"
            class="elevation-1"
          >
            <template v-slot:item.actions="{ item }">
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-delete-forever" size="small" color="error" @click="selectedKafka && deleteConsumerGroup(item)"></v-btn>
                </template>
                <span>Delete Consumer Group</span>
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
              <v-radio label="Topic" value="topic"></v-radio>
            </v-radio-group>
            <v-text-field
              v-model="newEntity.name"
              label="New Topic Name*"
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
import type { KafkaTopic, KafkaConsumerGroup } from '@/services/models';
import {
  getKafkas,
  fetchData as apiFetchData,
  createEntity as apiCreateEntity,
  deleteKafkaTopic as apiDeleteTopic,
  deleteKafkaConsumerGroup as apiDeleteConsumerGroup,
} from '@/services/api';

// Refs
const kafkas = ref<{name: string}[]>([]);
const selectedKafka = ref<string | null>(null);
const topics = ref<KafkaTopic[]>([]);
const totalTopics = ref(0);
const consumerGroups = ref<KafkaConsumerGroup[]>([]);
const totalConsumerGroups = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);
const entityTypeFilter = ref<'topics' | 'consumer-groups'>('topics');
const nameFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(10); // Default items per page
const sortBy = ref<any[]>([]);
const createDialog = ref(false);
const creating = ref(false);
const newEntity = ref({
  type: 'topic',
  name: ''
});

// Headers
const topicHeaders: any = [
  { title: 'Name', key: 'topic', sortable: true },
  { title: 'Partitions', key: 'partitions', sortable: true },
  { title: 'Replicas', key: 'replicationFactor', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end'  },
];

const consumerGroupHeaders: any = [
  { title: 'Name', key: 'groupId', sortable: true },
  { title: 'State', key: 'state', sortable: true },
  { title: 'Members', key: 'members', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end'  },
];

// Methods
async function fetchData({ page, itemsPerPage, sortBy: newSortBy }: { page: number, itemsPerPage: number, sortBy: any[] }) {
  if (!selectedKafka.value) {
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
      selectedKafka.value,
      'kafka',
      entityTypeFilter.value,
      page,
      itemsPerPage,
      nameFilter.value,
      '',
      sortBy.value
    );

    if (entityTypeFilter.value === 'topics') {
      topics.value = data.items;
      totalTopics.value = data.total;
    } else {
      consumerGroups.value = data.items;
      totalConsumerGroups.value = data.total;
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
    const kfks = await getKafkas();
    kafkas.value = kfks;
    if (kfks.length > 0) {
      selectedKafka.value = kfks[0].name;
    }
  } catch (e: any) {
    error.value = `Failed to fetch Kafka list: ${e.message}`;
  }
});

watch([selectedKafka, entityTypeFilter, nameFilter], () => {
  if (!selectedKafka.value) return;
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
      type: 'topic',
      name: ''
    };
  }, 300);
}

async function handleCreateEntity() {
  creating.value = true;
  error.value = null;
  if (!selectedKafka.value) {
    alert('Please select a Kafka instance first.');
    creating.value = false;
    return;
  }
  try {
    const result = await apiCreateEntity(
      selectedKafka.value,
      newEntity.value.type,
      newEntity.value.name,
      undefined
    );

    alert(result.message); // Success message
    closeCreateDialog();
    entityTypeFilter.value = 'topics';
    fetchData({ page: 1, itemsPerPage: pageSize.value, sortBy: sortBy.value });

  } catch (e: any) {
    alert(`Creation failed: ${e.message}`);
  } finally {
    creating.value = false;
  }
}

// Action Methods
async function deleteTopic(topic: KafkaTopic) {
  if (!selectedKafka.value) return;
  if (!confirm(`Are you sure you want to DELETE topic ${topic.topic}? This action cannot be undone.`)) return;
  try {
    const result = await apiDeleteTopic(selectedKafka.value, topic);
    alert(result.message);
    fetchData({ page: currentPage.value, itemsPerPage: pageSize.value, sortBy: sortBy.value });
  } catch (e: any) {
    error.value = `Failed to delete topic: ${e.message}`;
  }
}

async function deleteConsumerGroup(group: KafkaConsumerGroup) {
  if (!selectedKafka.value) return;
  if (!confirm(`Are you sure you want to DELETE consumer group ${group.groupId}? This action cannot be undone.`)) return;
  try {
    const result = await apiDeleteConsumerGroup(selectedKafka.value, group);
    alert(result.message);
    fetchData({ page: currentPage.value, itemsPerPage: pageSize.value, sortBy: sortBy.value });
  } catch (e: any) {
    error.value = `Failed to delete consumer group: ${e.message}`;
  }
}
</script>

<style scoped>
.v-data-table-header__icon {
  display: none !important;
}
</style>
