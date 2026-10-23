import json
from app import config
from app.services import db_service, llm_service

def process_ticket_job(ticket_id: str):
    """
    Core AI logic: Loads ticket context, invokes LLM with knowledge base,
    and updates PostgreSQL with classification, priority, and response draft.
    """
    print(f"[AI-Worker] Processing ticket AI for ticket_id: {ticket_id}")
    
    # 1. Fetch ticket and context
    ticket = db_service.get_ticket_context(ticket_id)
    if not ticket:
        print(f"[AI-Worker] Error: Ticket {ticket_id} not found in database.")
        return False

    try:
        # 2. Invoke LLM service
        ai_output = llm_service.generate_ai_analysis(ticket)
        category = ai_output.get("category", "General Inquiry")
        priority = ai_output.get("priority", "Medium")
        draft = ai_output.get("draft_response", "")

        # Validate category and priority within allowed enum constraints
        if category not in config.ALLOWED_CATEGORIES:
            category = "General Inquiry"
        if priority not in config.ALLOWED_PRIORITIES:
            priority = "Medium"

        # 3. Update PostgreSQL
        db_service.update_ticket_ai_results(
            ticket_id=ticket_id,
            category=category,
            priority=priority,
            ai_draft_response=draft,
            ai_status="completed"
        )
        print(f"[AI-Worker] Successfully processed ticket {ticket_id}: Category='{category}', Priority='{priority}'")
        return True
    except Exception as e:
        print(f"[AI-Worker] Error processing ticket {ticket_id}: {e}")
        db_service.mark_ai_failed(ticket_id)
        return False

def lambda_handler(event, context):
    """
    Standard AWS Lambda entry point triggered by AWS SQS events.
    Compatible with AWS Lambda + SQS event mapping.
    """
    records = event.get("Records", [])
    print(f"[Lambda] Received {len(records)} SQS records")
    
    success_count = 0
    for record in records:
        try:
            body = record.get("body", "{}")
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body
                
            ticket_id = data.get("ticketId")
            if ticket_id:
                if process_ticket_job(ticket_id):
                    success_count += 1
        except Exception as e:
            print(f"[Lambda] Error parsing record: {e}")

    return {
        "statusCode": 200,
        "body": json.dumps({"processed": len(records), "success": success_count})
    }
