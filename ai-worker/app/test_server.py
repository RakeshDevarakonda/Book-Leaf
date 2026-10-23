"""
Local Test Server for AI Worker
Allows direct HTTP testing of lambda_handler and ticket processing without needing AWS SQS.
Runs on http://localhost:8000 using Python's built-in http.server (no extra dependencies needed).
"""

import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from app.handlers.lambda_handler import lambda_handler, process_ticket_job

class TestServerHandler(BaseHTTPRequestHandler):
    def _send_response(self, status_code: int, data: dict):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/" or self.path == "/health":
            self._send_response(200, {
                "status": "online",
                "message": "AI Worker Local Test Server is running.",
                "endpoints": {
                    "POST /simulate-sqs": "Send a standard SQS event to lambda_handler",
                    "POST /process-ticket": "Send {'ticketId': '...'} to process a single ticket directly"
                }
            })
        else:
            self._send_response(404, {"error": "Not Found"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        
        try:
            payload = json.loads(body)
        except Exception:
            return self._send_response(400, {"error": "Invalid JSON body"})

        # Route 1: Simulate AWS SQS Event invoking lambda_handler(event, context)
        if self.path == "/simulate-sqs":
            # If payload is just {"ticketId": "..."}, auto-wrap in standard AWS SQS event format
            if "Records" not in payload and "ticketId" in payload:
                event = {
                    "Records": [
                        {
                            "messageId": "mock-sqs-msg-1",
                            "body": json.dumps(payload),
                        }
                    ]
                }
            else:
                event = payload

            print("\n[TestServer] Invoking lambda_handler with event:")
            print(json.dumps(event, indent=2))
            
            result = lambda_handler(event, None)
            return self._send_response(200, {
                "success": True,
                "message": "lambda_handler executed",
                "lambda_result": result
            })

        # Route 2: Direct Ticket Processing by ID
        elif self.path == "/process-ticket":
            ticket_id = payload.get("ticketId")
            if not ticket_id:
                return self._send_response(400, {"error": "ticketId is required in JSON body"})

            print(f"\n[TestServer] Direct processing for ticketId: {ticket_id}")
            success = process_ticket_job(ticket_id)
            return self._send_response(200, {
                "success": success,
                "ticketId": ticket_id,
                "message": "Ticket processed and database updated" if success else "Processing failed (see console)"
            })

        else:
            self._send_response(404, {"error": f"Unknown endpoint {self.path}"})

def run_test_server(port: int = 8000):
    server = HTTPServer(("0.0.0.0", port), TestServerHandler)
    print("=" * 60)
    print(f"🚀 AI Worker Local Test Server running on http://localhost:{port}")
    print("=" * 60)
    print("Endpoints available for testing:")
    print(f"  GET  http://localhost:{port}/health")
    print(f"  POST http://localhost:{port}/simulate-sqs   (Tests AWS lambda_handler)")
    print(f"  POST http://localhost:{port}/process-ticket (Processes single ticket by ID)")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down test server.")
        server.server_close()

if __name__ == "__main__":
    run_test_server()
