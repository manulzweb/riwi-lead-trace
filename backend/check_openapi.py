import sys
import traceback
from app.main import app

try:
    schema = app.openapi()
    print("OpenAPI schema generated successfully!")
except Exception as e:
    print("Error generating OpenAPI schema:")
    traceback.print_exc()
    sys.exit(1)
