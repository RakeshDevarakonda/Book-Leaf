import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import crypto from 'crypto';
import { env } from '../config/env';

// Lazy client initialization (only connects if configured)
let sqsClient: SQSClient | null = null;

function getSQSClient(): SQSClient | null {
  if (!env.SQS_QUEUE_URL) {
    return null;
  }
  if (!sqsClient) {
    sqsClient = new SQSClient({ region: env.AWS_REGION });
  }
  return sqsClient;
}

export interface TicketQueueMessage {
  jobId: string;
  jobType: 'PROCESS_TICKET_AI';
  ticketId: string;
  timestamp: number;
}

export const queueService = {
  /**
   * Pushes a ticket AI processing job to AWS SQS.
   * Safe & graceful: Never throws or breaks ticket creation if SQS is offline or unconfigured.
   */
  async enqueueTicketAiJob(ticketId: string): Promise<boolean> {
    const client = getSQSClient();

    const payload: TicketQueueMessage = {
      jobId: crypto.randomUUID(),
      jobType: 'PROCESS_TICKET_AI',
      ticketId,
      timestamp: Math.floor(Date.now() / 1000),
    };

    if (!client || !env.SQS_QUEUE_URL) {
      console.log(`[QueueService] SQS_QUEUE_URL not configured. Simulated queueing for ticket: ${ticketId}`);
      return false;
    }

    try {
      const command = new SendMessageCommand({
        QueueUrl: env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify(payload),
        MessageAttributes: {
          jobType: {
            DataType: 'String',
            StringValue: 'PROCESS_TICKET_AI',
          },
        },
      });

      await client.send(command);
      console.log(`[QueueService] Successfully enqueued ticket ${ticketId} to SQS`);
      return true;
    } catch (err: any) {
      // Graceful degradation: log error without crashing the user's ticket creation flow
      console.error(`[QueueService] Warning: Failed to publish ticket ${ticketId} to SQS:`, err.message);
      return false;
    }
  },
};
