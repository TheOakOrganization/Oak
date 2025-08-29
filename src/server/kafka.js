import { Kafka } from 'kafkajs';
import { logger } from './config.js';

const kafkas = [
  {
    name: 'local',
    brokers: ['localhost:9092']
  }
];

export function getKafkas() {
  return kafkas.map(k => ({ name: k.name }));
}

async function getKafkaClient(name) {
  const kafkaConfig = kafkas.find(k => k.name === name);
  if (!kafkaConfig) {
    throw new Error(`Kafka instance ${name} not found`);
  }
  return new Kafka({
    clientId: 'oak-project',
    brokers: kafkaConfig.brokers
  });
}

export async function getTopics(kafkaName, skip, top, nameFilter, orderBy, order) {
  const kafka = await getKafkaClient(kafkaName);
  const admin = kafka.admin();
  await admin.connect();
  const topics = await admin.listTopics();
  await admin.disconnect();

  let filteredTopics = topics;
  if (nameFilter) {
    filteredTopics = topics.filter(t => t.toLowerCase().includes(nameFilter));
  }

  // Sorting and pagination are not implemented for this example

  return {
    items: filteredTopics.map(t => ({ topic: t, partitions: 0, replicationFactor: 0 })),
    total: filteredTopics.length
  };
}

export async function getConsumerGroups(kafkaName, skip, top, nameFilter, orderBy, order) {
  const kafka = await getKafkaClient(kafkaName);
  const admin = kafka.admin();
  await admin.connect();
  const groups = await admin.listGroups();
  await admin.disconnect();

  let filteredGroups = groups.groups;
  if (nameFilter) {
    filteredGroups = groups.groups.filter(g => g.groupId.toLowerCase().includes(nameFilter));
  }

  // Sorting and pagination are not implemented for this example

  return {
    items: filteredGroups.map(g => ({ groupId: g.groupId, state: 'unknown', members: 0 })),
    total: filteredGroups.length
  };
}

export async function createTopic(kafkaName, topicName) {
  const kafka = await getKafkaClient(kafkaName);
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({
    topics: [{ topic: topicName }]
  });
  await admin.disconnect();
}

export async function deleteTopic(kafkaName, topicName) {
  const kafka = await getKafkaClient(kafkaName);
  const admin = kafka.admin();
  await admin.connect();
  await admin.deleteTopics({
    topics: [topicName]
  });
  await admin.disconnect();
}

export async function deleteConsumerGroup(kafkaName, groupId) {
  const kafka = await getKafkaClient(kafkaName);
  const admin = kafka.admin();
  await admin.connect();
  await admin.deleteGroups([groupId]);
  await admin.disconnect();
}
