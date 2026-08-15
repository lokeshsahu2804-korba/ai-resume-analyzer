import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Server configuration
FASTAPI_PORT = int(os.getenv("FASTAPI_PORT", "8000"))

# Internal Microservice Communication Key
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
