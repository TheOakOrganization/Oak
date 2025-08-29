import express from 'express';
import {
  getQueues as getSbQueues,
  getSubscriptions,
  createTopic as createSbTopic,
  createQueue as createSbQueue,
  createSubscription,
  purgeActiveMessages,
  purgeDlq,
  purgeQueueActiveMessages,
  purgeQueueDlq,
  setQueueStatus,
  deleteQueue as deleteSbQueue,
  setSubscriptionStatus,
  deleteSubscription,
  getServiceBuses
} from './serviceBus.js';
import {
  getQueues as getRmqQueues,
  getExchanges as getRmqExchanges,
  createQueue as createRmqQueue,
  createExchange as createRmqExchange,
  purgeQueue as purgeRmqQueue,
  deleteQueue as deleteRmqQueue,
  deleteExchange as deleteRmqExchange,
  getRabbitMqs
} from './rabbitMq.js';
import {
  getTopics as getKafkaTopics,
  getConsumerGroups as getKafkaConsumerGroups,
  createTopic as createKafkaTopic,
  deleteTopic as deleteKafkaTopic,
  deleteConsumerGroup as deleteKafkaConsumerGroup,
  getKafkas
} from './kafka.js';
import { logger } from './config.js';

export const apiRouter = express.Router();

apiRouter.get('/servicebuses', (req, res) => {
  res.json(getServiceBuses());
});

apiRouter.get('/rabbitmqs', (req, res) => {
  res.json(getRabbitMqs());
});

apiRouter.get('/kafkas', (req, res) => {
  res.json(getKafkas());
});

apiRouter.get('/queues', async (req, res) => {
  logger.info('Received request to fetch queues...');
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const top = parseInt(req.query.top, 10) || 25;
    const nameFilter = (req.query.nameFilter || '').toLowerCase();
    const { orderBy, order, serviceBusName } = req.query;

    if (!serviceBusName) {
      return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
    }

    const { items, total } = await getSbQueues(serviceBusName, skip, top, nameFilter, orderBy, order);
    logger.info(`Returning ${items.length} of ${total} queues.`);
    res.json({ items, total });
  } catch (err) {
    logger.error({ err }, 'Error fetching queues:');
    res.status(500).json({ error: 'Failed to fetch queues.', message: err.message });
  }
});

apiRouter.get('/subscriptions', async (req, res) => {
  logger.info('Received request to fetch subscriptions...');
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const top = parseInt(req.query.top, 10) || 25;
    const nameFilter = (req.query.nameFilter || '').toLowerCase();
    const subscriptionNameFilter = (req.query.subscriptionNameFilter || '').toLowerCase();
    const { orderBy, order, serviceBusName } = req.query;

    if (!serviceBusName) {
      return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
    }

    const { items, total } = await getSubscriptions(serviceBusName, skip, top, nameFilter, subscriptionNameFilter, orderBy, order);
    logger.info(`Returning ${items.length} of ${total} subscriptions.`);
    res.json({ items, total });
  } catch (err) {
    logger.error({ err }, 'Error fetching subscriptions:');
    res.status(500).json({ error: 'Failed to fetch subscriptions.', message: err.message });
  }
});

apiRouter.post('/topics', async (req, res) => {
  const { serviceBusName } = req.query;
  const { name } = req.body;
  logger.info(`Creating topic: ${name}`);
  if (!name) {
    return res.status(400).json({ error: 'Topic name is required.' });
  }
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    await createSbTopic(serviceBusName, name);
    res.status(201).json({ message: `Topic '${name}' created successfully.` });
  } catch (err) {
    logger.error({ err }, `Error creating topic:`);
    res.status(500).json({ error: 'Failed to create topic.', message: err.message });
  }
});

apiRouter.post('/queues', async (req, res) => {
  const { serviceBusName } = req.query;
  const { name } = req.body;
  logger.info(`Creating queue: ${name}`);
  if (!name) {
    return res.status(400).json({ error: 'Queue name is required.' });
  }
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    await createSbQueue(serviceBusName, name);
    res.status(201).json({ message: `Queue '${name}' created successfully.` });
  } catch (err) {
    logger.error({ err }, `Error creating queue:`);
    res.status(500).json({ error: 'Failed to create queue.', message: err.message });
  }
});

apiRouter.post('/subscriptions', async (req, res) => {
  const { serviceBusName } = req.query;
  const { topicName, subscriptionName } = req.body;
  logger.info(`Creating subscription '${subscriptionName}' for topic '${topicName}'`);
  if (!topicName || !subscriptionName) {
    return res.status(400).json({ error: 'Topic name and subscription name are required.' });
  }
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    await createSubscription(serviceBusName, topicName, subscriptionName);
    res.status(201).json({ message: `Subscription '${subscriptionName}' created successfully for topic '${topicName}'.` });
  } catch (err) {
    logger.error({ err }, `Error creating subscription:`);
    res.status(500).json({ error: 'Failed to create subscription.', message: err.message });
  }
});

apiRouter.post('/subscriptions/purge-active', async (req, res) => {
  const { serviceBusName } = req.query;
  const { topicName, subscriptionName } = req.body;
  logger.info(`Purging active messages for ${topicName}/${subscriptionName}`);
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    const count = await purgeActiveMessages(serviceBusName, topicName, subscriptionName);
    logger.info(`Total purged active messages: ${count}`);
    res.json({ message: `Successfully purged ${count} active messages.` });
  } catch (err) {
    logger.error({ err }, 'Error purging active messages:');
    res.status(500).json({ error: 'Failed to purge active messages.', message: err.message });
  }
});

apiRouter.post('/subscriptions/purge-dlq', async (req, res) => {
  const { serviceBusName } = req.query;
  const { topicName, subscriptionName } = req.body;
  logger.info(`Purging DLQ messages for ${topicName}/${subscriptionName}`);
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    const count = await purgeDlq(serviceBusName, topicName, subscriptionName);
    logger.info(`Total purged DLQ messages: ${count}`);
    res.json({ message: `Successfully purged ${count} DLQ messages.` });
  } catch (err) {
    logger.error({ err }, 'Error purging DLQ messages:');
    res.status(500).json({ error: 'Failed to purge DLQ messages.', message: err.message });
  }
});

apiRouter.post('/queues/purge-active', async (req, res) => {
  const { serviceBusName } = req.query;
  const { queueName } = req.body;
  logger.info(`Purging active messages for queue ${queueName}`);
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    const count = await purgeQueueActiveMessages(serviceBusName, queueName);
    logger.info(`Total purged active messages: ${count}`);
    res.json({ message: `Successfully purged ${count} active messages.` });
  } catch (err) {
    logger.error({ err }, 'Error purging active messages from queue:');
    res.status(500).json({ error: 'Failed to purge active messages.', message: err.message });
  }
});

apiRouter.post('/queues/purge-dlq', async (req, res) => {
  const { serviceBusName } = req.query;
  const { queueName } = req.body;
  logger.info(`Purging DLQ messages for queue ${queueName}`);
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    const count = await purgeQueueDlq(serviceBusName, queueName);
    logger.info(`Total purged DLQ messages: ${count}`);
    res.json({ message: `Successfully purged ${count} DLQ messages.` });
  } catch (err) {
    logger.error({ err }, 'Error purging DLQ messages from queue:');
    res.status(500).json({ error: 'Failed to purge DLQ messages.', message: err.message });
  }
});

apiRouter.post('/queues/status', async (req, res) => {
  const { serviceBusName } = req.query;
  const { queueName, status } = req.body;
  if (status !== 'Active' && status !== 'Disabled') {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  logger.info(`Setting status to ${status} for queue ${queueName}`);
  try {
    await setQueueStatus(serviceBusName, queueName, status);
    res.json({ message: `Queue status updated to ${status}.` });
  } catch (err) {
    logger.error({ err }, `Error updating queue status:`);
    res.status(500).json({ error: 'Failed to update queue status.', message: err.message });
  }
});

apiRouter.delete('/queues/delete', async (req, res) => {
  const { serviceBusName } = req.query;
  const { queueName } = req.body;
  logger.info(`Deleting queue ${queueName}`);
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    await deleteSbQueue(serviceBusName, queueName);
    res.json({ message: 'Queue deleted successfully.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting queue:');
    res.status(500).json({ error: 'Failed to delete queue.', message: err.message });
  }
});

apiRouter.post('/subscriptions/status', async (req, res) => {
  const { serviceBusName } = req.query;
  const { topicName, subscriptionName, status } = req.body;
  if (status !== 'Active' && status !== 'Disabled') {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  logger.info(`Setting status to ${status} for subscription ${topicName}/${subscriptionName}`);
  try {
    await setSubscriptionStatus(serviceBusName, topicName, subscriptionName, status);
    res.json({ message: `Subscription status updated to ${status}.` });
  } catch (err) {
    logger.error({ err }, `Error updating subscription status:`);
    res.status(500).json({ error: 'Failed to update subscription status.', message: err.message });
  }
});

apiRouter.delete('/subscriptions/delete', async (req, res) => {
  const { serviceBusName } = req.query;
  const { topicName, subscriptionName } = req.body;
  logger.info(`Deleting subscription ${topicName}/${subscriptionName}`);
  if (!serviceBusName) {
    return res.status(400).json({ error: 'serviceBusName query parameter is required.' });
  }
  try {
    await deleteSubscription(serviceBusName, topicName, subscriptionName);
    res.json({ message: 'Subscription deleted successfully.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting subscription:');
    res.status(500).json({ error: 'Failed to delete subscription.', message: err.message });
  }
});

// RabbitMQ routes
apiRouter.get('/rabbitmq/queues', async (req, res) => {
  logger.info('Received request to fetch RabbitMQ queues...');
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const top = parseInt(req.query.top, 10) || 25;
    const nameFilter = (req.query.nameFilter || '').toLowerCase();
    const { orderBy, order, rabbitMqName } = req.query;

    if (!rabbitMqName) {
      return res.status(400).json({ error: 'rabbitMqName query parameter is required.' });
    }

    const { items, total } = await getRmqQueues(rabbitMqName, skip, top, nameFilter, orderBy, order);
    logger.info(`Returning ${items.length} of ${total} RabbitMQ queues.`);
    res.json({ items, total });
  } catch (err) {
    logger.error({ err }, 'Error fetching RabbitMQ queues:');
    res.status(500).json({ error: 'Failed to fetch RabbitMQ queues.', message: err.message });
  }
});

apiRouter.get('/rabbitmq/exchanges', async (req, res) => {
  logger.info('Received request to fetch RabbitMQ exchanges...');
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const top = parseInt(req.query.top, 10) || 25;
    const nameFilter = (req.query.nameFilter || '').toLowerCase();
    const { orderBy, order, rabbitMqName } = req.query;

    if (!rabbitMqName) {
      return res.status(400).json({ error: 'rabbitMqName query parameter is required.' });
    }

    const { items, total } = await getRmqExchanges(rabbitMqName, skip, top, nameFilter, orderBy, order);
    logger.info(`Returning ${items.length} of ${total} RabbitMQ exchanges.`);
    res.json({ items, total });
  } catch (err) {
    logger.error({ err }, 'Error fetching RabbitMQ exchanges:');
    res.status(500).json({ error: 'Failed to fetch RabbitMQ exchanges.', message: err.message });
  }
});

apiRouter.post('/rabbitmq/queues', async (req, res) => {
  const { rabbitMqName } = req.query;
  const { name } = req.body;
  logger.info(`Creating RabbitMQ queue: ${name}`);
  if (!name) {
    return res.status(400).json({ error: 'Queue name is required.' });
  }
  if (!rabbitMqName) {
    return res.status(400).json({ error: 'rabbitMqName query parameter is required.' });
  }
  try {
    await createRmqQueue(rabbitMqName, name);
    res.status(201).json({ message: `Queue '${name}' created successfully.` });
  } catch (err) {
    logger.error({ err }, `Error creating RabbitMQ queue:`);
    res.status(500).json({ error: 'Failed to create RabbitMQ queue.', message: err.message });
  }
});

apiRouter.post('/rabbitmq/exchanges', async (req, res) => {
  const { rabbitMqName } = req.query;
  const { name } = req.body;
  logger.info(`Creating RabbitMQ exchange: ${name}`);
  if (!name) {
    return res.status(400).json({ error: 'Exchange name is required.' });
  }
  if (!rabbitMqName) {
    return res.status(400).json({ error: 'rabbitMqName query parameter is required.' });
  }
  try {
    await createRmqExchange(rabbitMqName, name);
    res.status(201).json({ message: `Exchange '${name}' created successfully.` });
  } catch (err) {
    logger.error({ err }, `Error creating RabbitMQ exchange:`);
    res.status(500).json({ error: 'Failed to create RabbitMQ exchange.', message: err.message });
  }
});

apiRouter.post('/rabbitmq/queues/purge', async (req, res) => {
  const { rabbitMqName } = req.query;
  const { queueName } = req.body;
  logger.info(`Purging messages for RabbitMQ queue ${queueName}`);
  if (!rabbitMqName) {
    return res.status(400).json({ error: 'rabbitMqName query parameter is required.' });
  }
  try {
    const count = await purgeRmqQueue(rabbitMqName, queueName);
    logger.info(`Total purged messages: ${count}`);
    res.json({ message: `Successfully purged ${count} messages.` });
  } catch (err) {
    logger.error({ err }, 'Error purging messages from RabbitMQ queue:');
    res.status(500).json({ error: 'Failed to purge messages.', message: err.message });
  }
});

apiRouter.delete('/rabbitmq/queues/delete', async (req, res) => {
  const { rabbitMqName } = req.query;
  const { queueName } = req.body;
  logger.info(`Deleting RabbitMQ queue ${queueName}`);
  if (!rabbitMqName) {
    return res.status(400).json({ error: 'rabbitMqName query parameter is required.' });
  }
  try {
    await deleteRmqQueue(rabbitMqName, queueName);
    res.json({ message: 'Queue deleted successfully.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting RabbitMQ queue:');
    res.status(500).json({ error: 'Failed to delete RabbitMQ queue.', message: err.message });
  }
});

apiRouter.delete('/rabbitmq/exchanges/delete', async (req, res) => {
  const { rabbitMqName } = req.query;
  const { exchangeName } = req.body;
  logger.info(`Deleting RabbitMQ exchange ${exchangeName}`);
  if (!rabbitMqName) {
    return res.status(400).json({ error: 'rabbitMqName query parameter is required.' });
  }
  try {
    await deleteRmqExchange(rabbitMqName, exchangeName);
    res.json({ message: 'Exchange deleted successfully.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting RabbitMQ exchange:');
    res.status(500).json({ error: 'Failed to delete RabbitMQ exchange.', message: err.message });
  }
});

// Kafka routes
apiRouter.get('/kafka/topics', async (req, res) => {
  logger.info('Received request to fetch Kafka topics...');
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const top = parseInt(req.query.top, 10) || 25;
    const nameFilter = (req.query.nameFilter || '').toLowerCase();
    const { orderBy, order, kafkaName } = req.query;

    if (!kafkaName) {
      return res.status(400).json({ error: 'kafkaName query parameter is required.' });
    }

    const { items, total } = await getKafkaTopics(kafkaName, skip, top, nameFilter, orderBy, order);
    logger.info(`Returning ${items.length} of ${total} Kafka topics.`);
    res.json({ items, total });
  } catch (err) {
    logger.error({ err }, 'Error fetching Kafka topics:');
    res.status(500).json({ error: 'Failed to fetch Kafka topics.', message: err.message });
  }
});

apiRouter.get('/kafka/consumer-groups', async (req, res) => {
  logger.info('Received request to fetch Kafka consumer groups...');
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const top = parseInt(req.query.top, 10) || 25;
    const nameFilter = (req.query.nameFilter || '').toLowerCase();
    const { orderBy, order, kafkaName } = req.query;

    if (!kafkaName) {
      return res.status(400).json({ error: 'kafkaName query parameter is required.' });
    }

    const { items, total } = await getKafkaConsumerGroups(kafkaName, skip, top, nameFilter, orderBy, order);
    logger.info(`Returning ${items.length} of ${total} Kafka consumer groups.`);
    res.json({ items, total });
  } catch (err) {
    logger.error({ err }, 'Error fetching Kafka consumer groups:');
    res.status(500).json({ error: 'Failed to fetch Kafka consumer groups.', message: err.message });
  }
});

apiRouter.post('/kafka/topics', async (req, res) => {
  const { kafkaName } = req.query;
  const { name } = req.body;
  logger.info(`Creating Kafka topic: ${name}`);
  if (!name) {
    return res.status(400).json({ error: 'Topic name is required.' });
  }
  if (!kafkaName) {
    return res.status(400).json({ error: 'kafkaName query parameter is required.' });
  }
  try {
    await createKafkaTopic(kafkaName, name);
    res.status(201).json({ message: `Topic '${name}' created successfully.` });
  } catch (err) {
    logger.error({ err }, `Error creating Kafka topic:`);
    res.status(500).json({ error: 'Failed to create Kafka topic.', message: err.message });
  }
});

apiRouter.delete('/kafka/topics/delete', async (req, res) => {
  const { kafkaName } = req.query;
  const { topicName } = req.body;
  logger.info(`Deleting Kafka topic ${topicName}`);
  if (!kafkaName) {
    return res.status(400).json({ error: 'kafkaName query parameter is required.' });
  }
  try {
    await deleteKafkaTopic(kafkaName, topicName);
    res.json({ message: 'Topic deleted successfully.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting Kafka topic:');
    res.status(500).json({ error: 'Failed to delete Kafka topic.', message: err.message });
  }
});

apiRouter.delete('/kafka/consumer-groups/delete', async (req, res) => {
  const { kafkaName } = req.query;
  const { groupId } = req.body;
  logger.info(`Deleting Kafka consumer group ${groupId}`);
  if (!kafkaName) {
    return res.status(400).json({ error: 'kafkaName query parameter is required.' });
  }
  try {
    await deleteKafkaConsumerGroup(kafkaName, groupId);
    res.json({ message: 'Consumer group deleted successfully.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting Kafka consumer group:');
    res.status(500).json({ error: 'Failed to delete Kafka consumer group.', message: err.message });
  }
});
