export interface Subscription {
  subscriptionName: string;
  topicName: string;
  status: string;
  activeMessageCount: number;
  deadLetterMessageCount: number;
  transferMessageCount: number;
  transferDeadLetterMessageCount: number;
}

export interface Queue {
  name: string;
  status: string;
  activeMessageCount: number;
  deadLetterMessageCount: number;
  scheduledMessageCount: number;
  transferMessageCount: number;
  transferDeadLetterMessageCount: number;
  sizeInBytes: number;
}

export interface RabbitMqQueue {
  name: string;
  messages: number;
  consumers: number;
}

export interface RabbitMqExchange {
  name: string;
  type: string;
  durable: boolean;
  auto_delete: boolean;
  internal: boolean;
}
