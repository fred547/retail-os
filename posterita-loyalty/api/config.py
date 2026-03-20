import os

ZOHO_CLIENT_ID = os.environ.get("ZOHO_CLIENT_ID", "")
ZOHO_CLIENT_SECRET = os.environ.get("ZOHO_CLIENT_SECRET", "")
ZOHO_REFRESH_TOKEN = os.environ.get("ZOHO_REFRESH_TOKEN", "")
ZOHO_APP_OWNER = os.environ.get("ZOHO_APP_OWNER", "fred_tamakgroup")
ZOHO_APP_NAME = os.environ.get("ZOHO_APP_NAME", "product-catalogue")
ZOHO_ACCOUNTS_URL = os.environ.get("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com")
ZOHO_CREATOR_API_URL = os.environ.get("ZOHO_CREATOR_API_URL", "https://creator.zoho.com/api/v2")

LOYALTY_API_KEY = os.environ.get("LOYALTY_API_KEY", "")
LOYALTY_POINTS_PER_UNIT = int(os.environ.get("LOYALTY_POINTS_PER_UNIT", "1"))
LOYALTY_CURRENCY = os.environ.get("LOYALTY_CURRENCY", "MUR")
