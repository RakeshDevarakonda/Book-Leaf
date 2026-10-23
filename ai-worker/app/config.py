import os
from dotenv import load_dotenv

load_dotenv()

# Strict configuration enforcement: every environment variable must be defined in .env with zero fallbacks
required_env_vars = [
    "DATABASE_URL",
    "GEMINI_API_KEY",
    "AWS_REGION",
    "SQS_QUEUE_URL",
    "LLM_PROVIDER",
    "LLM_MODEL",
]

for var_name in required_env_vars:
    if os.getenv(var_name) is None:
        raise ValueError(
            f"FATAL CONFIGURATION ERROR: {var_name} must be defined in your .env file. No fallback is permitted."
        )

DATABASE_URL = os.environ["DATABASE_URL"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
AWS_REGION = os.environ["AWS_REGION"]
SQS_QUEUE_URL = os.environ["SQS_QUEUE_URL"]
LLM_PROVIDER = os.environ["LLM_PROVIDER"].lower()
LLM_MODEL = os.environ["LLM_MODEL"]

# Valid Assignment Categories & Priorities
ALLOWED_CATEGORIES = [
    "Royalty & Payments",
    "ISBN & Metadata Issues",
    "Printing & Quality",
    "Distribution & Availability",
    "Book Status & Production Updates",
    "General Inquiry",
]

ALLOWED_PRIORITIES = ["Critical", "High", "Medium", "Low"]
