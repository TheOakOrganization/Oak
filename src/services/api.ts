
import type { Queue, Subscription, RabbitMqQueue, RabbitMqExchange, KafkaTopic, KafkaConsumerGroup } from './models';

export async function fetchData(instanceName: string, serviceType: 'service-bus' | 'rabbitmq' | 'kafka', entityTypeFilter: 'topics' | 'queues' | 'exchanges' | 'consumer-groups' | 'rabbitmq-queues', currentPage: number, pageSize: number, nameFilter: string, subscriptionNameFilter: string, sortBy: any[]) {
    const skip = (currentPage - 1) * pageSize;
    const params = new URLSearchParams({
      skip: skip.toString(),
      top: pageSize.toString(),
      nameFilter: nameFilter,
    });

    let endpoint = '';
    if (serviceType === 'service-bus') {
      params.append('serviceBusName', instanceName);
      if (entityTypeFilter === 'topics' && subscriptionNameFilter) {
        params.append('subscriptionNameFilter', subscriptionNameFilter);
      }
      endpoint = entityTypeFilter === 'queues' ? '/api/queues' : '/api/subscriptions';
    } else if (serviceType === 'rabbitmq') {
      params.append('rabbitMqName', instanceName);
      endpoint = entityTypeFilter === 'exchanges' ? '/api/rabbitmq/exchanges' : '/api/rabbitmq/queues';
    } else if (serviceType === 'kafka') {
      params.append('kafkaName', instanceName);
      endpoint = entityTypeFilter === 'topics' ? '/api/kafka/topics' : '/api/kafka/consumer-groups';
    }


    if (sortBy && sortBy.length > 0) {
      params.append('orderBy', sortBy[0].key);
      params.append('order', sortBy[0].order);
    }

    const response = await fetch(`${endpoint}?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

export async function createEntity(instanceName: string, entityType: string, name: string, subscriptionName?: string) {
    let endpoint = '';
    let body = {};
    let validationError = '';
    let params = new URLSearchParams();

    if (entityType === 'queue') {
      if (!name) validationError = 'Queue name is required.';
      endpoint = '/api/queues';
      body = { name };
      params.append('serviceBusName', instanceName);
    } else if (entityType === 'topic') {
      if (!name) validationError = 'Topic name is required.';
      endpoint = '/api/topics';
      body = { name };
      params.append('serviceBusName', instanceName);
    } else if (entityType === 'subscription') { 
      if (!name) validationError = 'Topic name is required.';
      else if (!subscriptionName) validationError = 'Subscription name is required.';
      endpoint = '/api/subscriptions';
      body = {
        topicName: name,
        subscriptionName
      };
      params.append('serviceBusName', instanceName);
    } else if (entityType === 'rabbitmq-queue') {
      if (!name) validationError = 'Queue name is required.';
      endpoint = '/api/rabbitmq/queues';
      body = { name };
      params.append('rabbitMqName', instanceName);
    } else if (entityType === 'rabbitmq-exchange') {
      if (!name) validationError = 'Exchange name is required.';
      endpoint = '/api/rabbitmq/exchanges';
      body = { name };
      params.append('rabbitMqName', instanceName);
    } else { // kafka-topic
      if (!name) validationError = 'Topic name is required.';
      endpoint = '/api/kafka/topics';
      body = { name };
      params.append('kafkaName', instanceName);
    }

    if (validationError) {
      throw new Error(validationError);
    }

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create entity.');
    }

    return result;
}

async function serviceBusAction(serviceBusName: string, endpoint: string, body: object) {
  const response = await fetch(`${endpoint}?serviceBusName=${serviceBusName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to perform action');
  }
  return await response.json();
}

export async function purgeActive(serviceBusName: string, sub: Subscription) {
  return serviceBusAction(serviceBusName, '/api/subscriptions/purge-active', { topicName: sub.topicName, subscriptionName: sub.subscriptionName });
}

export async function purgeDlq(serviceBusName: string, sub: Subscription) {
  return serviceBusAction(serviceBusName, '/api/subscriptions/purge-dlq', { topicName: sub.topicName, subscriptionName: sub.subscriptionName });
}

export async function toggleSubscriptionStatus(serviceBusName: string, sub: Subscription) {
  const newStatus = sub.status === 'Active' ? 'Disabled' : 'Active';
  return serviceBusAction(serviceBusName, '/api/subscriptions/status', { topicName: sub.topicName, subscriptionName: sub.subscriptionName, status: newStatus });
}

export async function deleteSubscription(serviceBusName: string, sub: Subscription) {
  const response = await fetch(`/api/subscriptions/delete?serviceBusName=${serviceBusName}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName: sub.topicName, subscriptionName: sub.subscriptionName })
  });
  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete subscription');
  }
  return await response.json();
}

export async function purgeQueueActive(serviceBusName: string, queue: Queue) {
  return serviceBusAction(serviceBusName, '/api/queues/purge-active', { queueName: queue.name });
}

export async function purgeQueueDlq(serviceBusName: string, queue: Queue) {
  return serviceBusAction(serviceBusName, '/api/queues/purge-dlq', { queueName: queue.name });
}

export async function toggleQueueStatus(serviceBusName: string, queue: Queue) {
  const newStatus = queue.status === 'Active' ? 'Disabled' : 'Active';
  return serviceBusAction(serviceBusName, '/api/queues/status', { queueName: queue.name, status: newStatus });
}

export async function deleteQueue(serviceBusName: string, queue: Queue) {
  const response = await fetch(`/api/queues/delete?serviceBusName=${serviceBusName}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueName: queue.name })
  });
  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete queue');
  }
  return await response.json();
}

export async function getServiceBuses() {
    const response = await fetch('/api/servicebuses');
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

export async function getRabbitMqs() {
    const response = await fetch('/api/rabbitmqs');
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

async function rabbitMqAction(rabbitMqName: string, endpoint: string, body: object) {
  const response = await fetch(`${endpoint}?rabbitMqName=${rabbitMqName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to perform action');
  }
  return await response.json();
}

export async function purgeRabbitMqQueue(rabbitMqName: string, queue: RabbitMqQueue) {
  return rabbitMqAction(rabbitMqName, '/api/rabbitmq/queues/purge', { queueName: queue.name });
}

export async function deleteRabbitMqQueue(rabbitMqName: string, queue: RabbitMqQueue) {
  const response = await fetch(`/api/rabbitmq/queues/delete?rabbitMqName=${rabbitMqName}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueName: queue.name })
  });
  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete queue');
  }
  return await response.json();
}

export async function deleteRabbitMqExchange(rabbitMqName: string, exchange: RabbitMqExchange) {
  const response = await fetch(`/api/rabbitmq/exchanges/delete?rabbitMqName=${rabbitMqName}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exchangeName: exchange.name })
  });
  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete exchange');
  }
  return await response.json();
}

export async function getKafkas() {
    const response = await fetch('/api/kafkas');
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

export async function deleteKafkaTopic(kafkaName: string, topic: KafkaTopic) {
  const response = await fetch(`/api/kafka/topics/delete?kafkaName=${kafkaName}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName: topic.topic })
  });
  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete topic');
  }
  return await response.json();
}

export async function deleteKafkaConsumerGroup(kafkaName: string, group: KafkaConsumerGroup) {
  const response = await fetch(`/api/kafka/consumer-groups/delete?kafkaName=${kafkaName}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId: group.groupId })
  });
  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete consumer group');
  }
  return await response.json();
}
