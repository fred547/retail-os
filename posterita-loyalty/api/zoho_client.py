"""
Zoho Creator API client with OAuth2 token management.
Handles token refresh and provides CRUD operations on Creator forms.
"""
import logging
import threading
import time
import requests
from api import config

log = logging.getLogger(__name__)


class ZohoCreatorClient:
    """Thread-safe Zoho Creator V2 API client with auto-refreshing OAuth tokens."""

    def __init__(self):
        self._access_token = None
        self._token_expiry = 0
        self._lock = threading.Lock()

    def _refresh_token(self):
        """Refresh the OAuth2 access token using the stored refresh token."""
        resp = requests.post(
            f"{config.ZOHO_ACCOUNTS_URL}/oauth/v2/token",
            data={
                "refresh_token": config.ZOHO_REFRESH_TOKEN,
                "client_id": config.ZOHO_CLIENT_ID,
                "client_secret": config.ZOHO_CLIENT_SECRET,
                "grant_type": "refresh_token",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if "access_token" not in data:
            raise Exception(f"Token refresh failed: {data}")
        self._access_token = data["access_token"]
        # Tokens last 1 hour; refresh 5 min early
        self._token_expiry = time.time() + data.get("expires_in", 3600) - 300
        log.info("Zoho access token refreshed")

    def _get_token(self):
        with self._lock:
            if not self._access_token or time.time() >= self._token_expiry:
                self._refresh_token()
            return self._access_token

    def _headers(self):
        return {"Authorization": f"Zoho-oauthtoken {self._get_token()}"}

    def _base_url(self, report_name):
        return (
            f"{config.ZOHO_CREATOR_API_URL}"
            f"/{config.ZOHO_APP_OWNER}/{config.ZOHO_APP_NAME}"
            f"/report/{report_name}"
        )

    # ── CRUD Operations ──

    def get_records(self, report_name, criteria=None, max_records=200):
        """
        Fetch records from a Creator report.
        criteria: Zoho criteria string, e.g. '(Phone_Number == "+23051234567")'
        """
        params = {"max_records": max_records}
        if criteria:
            params["criteria"] = criteria
        resp = requests.get(
            self._base_url(report_name),
            headers=self._headers(),
            params=params,
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("data", [])
        if resp.status_code == 204:
            return []  # No records found
        log.warning("get_records %s failed: %s %s", report_name, resp.status_code, resp.text)
        return []

    def get_record_by_id(self, report_name, record_id):
        """Fetch a single record by its Creator record ID."""
        resp = requests.get(
            f"{self._base_url(report_name)}/{record_id}",
            headers=self._headers(),
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json().get("data", {})
        return None

    def create_record(self, form_name, data):
        """
        Create a new record in a Creator form.
        Returns the created record data or None on failure.
        """
        url = (
            f"{config.ZOHO_CREATOR_API_URL}"
            f"/{config.ZOHO_APP_OWNER}/{config.ZOHO_APP_NAME}"
            f"/form/{form_name}"
        )
        resp = requests.post(
            url,
            headers=self._headers(),
            json={"data": data},
            timeout=15,
        )
        if resp.status_code in (200, 201):
            return resp.json().get("data", {})
        log.warning("create_record %s failed: %s %s", form_name, resp.status_code, resp.text)
        return None

    def update_record(self, report_name, record_id, data):
        """Update an existing record by ID."""
        resp = requests.patch(
            f"{self._base_url(report_name)}/{record_id}",
            headers=self._headers(),
            json={"data": data},
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json().get("data", {})
        log.warning("update_record %s/%s failed: %s %s", report_name, record_id, resp.status_code, resp.text)
        return None


# Singleton instance
zoho = ZohoCreatorClient()
