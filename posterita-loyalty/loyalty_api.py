"""
Posterita Loyalty API
Serves as the loyalty.posterita.com backend.
Proxies requests to Zoho Creator as the source of truth.

Run:
  pip install -r requirements.txt
  export ZOHO_CLIENT_ID=... ZOHO_CLIENT_SECRET=... ZOHO_REFRESH_TOKEN=... LOYALTY_API_KEY=...
  python loyalty_api.py

Production:
  gunicorn loyalty_api:app --bind 0.0.0.0:8000 --workers 4
"""
import logging
import os
from functools import wraps
from flask import Flask, jsonify, request
from dotenv import load_dotenv

load_dotenv()

from api import config
from api.routes_balance import bp as balance_bp
from api.routes_award import bp as award_bp
from api.routes_consent import bp as consent_bp
from api.routes_voucher import bp as voucher_bp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
log = logging.getLogger(__name__)

app = Flask(__name__)


# ── Auth Middleware ──

@app.before_request
def authenticate():
    """Validate X-Account-Key header on all /api/ routes."""
    if not request.path.startswith("/api/"):
        return None
    if request.path == "/api/v1/health":
        return None

    api_key = request.headers.get("X-Account-Key", "")
    if not api_key:
        return jsonify({"error": "Missing X-Account-Key header"}), 401
    if config.LOYALTY_API_KEY and api_key != config.LOYALTY_API_KEY:
        return jsonify({"error": "Invalid API key"}), 403
    return None


# ── Health Check ──

@app.route("/api/v1/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "posterita-loyalty-api"})


# ── Register Blueprints ──

app.register_blueprint(balance_bp)
app.register_blueprint(award_bp)
app.register_blueprint(consent_bp)
app.register_blueprint(voucher_bp)


# ── Error Handlers ──

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request"}), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    log.exception("Internal server error")
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
