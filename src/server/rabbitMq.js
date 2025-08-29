import amqp from 'amqplib';
import { logger } from './config.js';

const rabbitMqs = [
  {
    name: 'local',
    url: 'amqp://localhost'
  }
];

export function getRabbitMqs() {
  return rabbitMqs.map(r => ({ name: r.name }));
}

async function getRabbitMqConnection(name) {
  const rabbitMq = rabbitMqs.find(r => r.name === name);
  if (!rabbitMq) {
    throw new Error(`RabbitMQ instance ${name} not found`);
  }
  return await amqp.connect(rabbitMq.url);
}

export async function getQueues(rabbitMqName, skip, top, nameFilter, orderBy, order) {
  const conn = await getRabbitMqConnection(rabbitMqName);
  const channel = await conn.createChannel();
  const queues = await channel.checkQueue();
  await conn.close();

  let filteredQueues = queues;
  if (nameFilter) {
    filteredQueues = queues.filter(q => q.queue.toLowerCase().includes(nameFilter));
  }

  if (orderBy) {
    filteredQueues.sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const paginatedQueues = filteredQueues.slice(skip, skip + top);

  return {
    items: paginatedQueues.map(q => ({ name: q.queue, messages: q.messageCount, consumers: q.consumerCount })),
    total: filteredQueues.length
  };
}

export async function getExchanges(rabbitMqName, skip, top, nameFilter, orderBy, order) {
  // amqplib doesn't have a direct way to list exchanges, so we'll need to use the management plugin API for this.
  // For now, we'll return an empty array.
  return {
    items: [],
    total: 0
  };
}

export async function createQueue(rabbitMqName, queueName) {
  const conn = await getRabbitMqConnection(rabbitMqName);
  const channel = await conn.createChannel();
  await channel.assertQueue(queueName, { durable: true });
  await conn.close();
}

export async function createExchange(rabbitMqName, exchangeName) {
  const conn = await getRabbitMqConnection(rabbitMqName);
  const channel = await conn.createChannel();
  await channel.assertExchange(exchangeName, 'topic', { durable: true });
  await conn.close();
}

export async function purgeQueue(rabbitMqName, queueName) {
  const conn = await getRabbitMqConnection(rabbitMqName);
  const channel = await conn.createChannel();
  const result = await channel.purgeQueue(queueName);
  await conn.close();
  return result.messageCount;
}

export async function deleteQueue(rabbitMqName, queueName) {
  const conn = await getRabbitMqConnection(rabbitMqName);
  const channel = await conn.createChannel();
  await channel.deleteQueue(queueName);
  await conn.close();
}

export async function deleteExchange(rabbitMqName, exchangeName) {
  const conn = await getRabbitMqConnection(rabbitMqName);
  const channel = await conn.createChannel();
  await channel.deleteExchange(exchangeName);
  await conn.close();
}
