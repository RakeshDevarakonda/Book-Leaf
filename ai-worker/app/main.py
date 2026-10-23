import time
import json
import boto3
from app import config
from app.handlers.lambda_handler import lambda_handler, process_ticket_job

def run_sqs_consumer():
    """
    Polls AWS SQS queue continuously for local development or ECS/VPS worker deployment.
    """
    if not config.SQS_QUEUE_URL:
        print("[AI-Worker] SQS_QUEUE_URL is not set. Standby mode.")
        print("[AI-Worker] You can test a ticket directly by running: python -m app.main <ticket_id>")
        return

    sqs = boto3.client("sqs", region_name=config.AWS_REGION)
    print(f"[AI-Worker] Polling SQS queue: {config.SQS_QUEUE_URL}")

    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=config.SQS_QUEUE_URL,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=10, # Long polling
            )

            messages = response.get("Messages", [])
            for msg in messages:
                receipt_handle = msg.get("ReceiptHandle")
                body = msg.get("Body", "{}")
                data = json.loads(body)

                ticket_id = data.get("ticketId")
                if ticket_id:
                    success = process_ticket_job(ticket_id)
                    if success and receipt_handle:
                        # Acknowledge & delete from SQS
                        sqs.delete_message(
                            QueueUrl=config.SQS_QUEUE_URL,
                            ReceiptHandle=receipt_handle
                        )
        except Exception as e:
            print(f"[AI-Worker] Polling error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # CLI test run: python -m app.main <ticket_uuid>
        test_ticket_id = sys.argv[1]
        print(f"Manually running AI processing on ticket: {test_ticket_id}")
        process_ticket_job(test_ticket_id)
    else:
        run_sqs_consumer()
