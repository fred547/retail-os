"""
POST /api/v1/consent
Records or updates WhatsApp marketing consent for a customer.
Creates loyalty wallet regardless of consent decision.
Consent only controls communication, not loyalty enrollment.
"""
import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from api.zoho_client import zoho

log = logging.getLogger(__name__)
bp = Blueprint("consent", __name__)


@bp.route("/api/v1/consent", methods=["POST"])
def update_consent():
    data = request.get_json(silent=True) or {}
    phone = _normalize(data.get("phone", ""))
    consent_granted = data.get("consentGranted", False)
    consent_source = data.get("consentSource", "POS")
    brand_name = data.get("brandName")
    store_id = data.get("storeId", 0)
    terminal_id = data.get("terminalId", 0)
    user_id = data.get("userId", 0)
    consent_timestamp = data.get("consentTimestamp")

    if not phone:
        return jsonify({"error": "phone is required"}), 400

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    ts = now
    if consent_timestamp:
        try:
            ts = datetime.utcfromtimestamp(consent_timestamp / 1000).strftime("%Y-%m-%dT%H:%M:%S")
        except (ValueError, TypeError, OSError):
            ts = now

    consent_status = "granted" if consent_granted else "denied"

    # Update or create Consent_Master
    existing = zoho.get_records(
        "Consent_Master_Report",
        criteria=f'(Phone_Number == "{phone}" && Channel == "whatsapp")',
        max_records=1,
    )

    consent_data = {
        "Phone_Number": phone,
        "Consent_Status": consent_status,
        "Consent_Scope": "brand_only" if consent_granted else "none",
        "Consent_Source": consent_source,
        "Channel": "whatsapp",
        "Consent_Timestamp": ts,
        "Last_Updated_By": f"POS-{store_id}-{terminal_id}-{user_id}",
    }

    if existing:
        zoho.update_record("Consent_Master_Report", existing[0]["ID"], consent_data)
    else:
        zoho.create_record("Consent_Master", consent_data)

    # Update or create Consent_Brand_Map (if brand specified)
    if brand_name:
        brand_existing = zoho.get_records(
            "Consent_Brand_Map_Report",
            criteria=f'(Phone_Number == "{phone}" && Brand == "{brand_name}")',
            max_records=1,
        )
        brand_data = {
            "Phone_Number": phone,
            "Brand": brand_name,
            "Status": "subscribed" if consent_granted else "unsubscribed",
            "Source": consent_source,
            "Timestamp": ts,
            "Scope_Snapshot": "brand_only",
            "Promo_Opt_In": consent_granted,
            "News_Opt_In": consent_granted,
        }
        if brand_existing:
            zoho.update_record("Consent_Brand_Map_Report", brand_existing[0]["ID"], brand_data)
        else:
            zoho.create_record("Consent_Brand_Map", brand_data)

    # Ensure wallet exists (loyalty enrollment happens regardless of consent)
    wallet = zoho.get_records(
        "Points_Wallet_Report",
        criteria=f'(Phone_Number == "{phone}")',
        max_records=1,
    )
    if not wallet:
        zoho.create_record("Points_Wallet", {
            "Phone_Number": phone,
            "Wallet_Balance": 0,
            "Lifetime_Earned": 0,
            "Lifetime_Redeemed": 0,
            "Wallet_Status": "active",
            "Last_Updated_At": now,
            "Last_Source": "pos_consent",
        })

    return jsonify({"status": "ok"}), 200


def _normalize(phone):
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone:
        return ""
    if not phone.startswith("+"):
        phone = f"+{phone}"
    return phone
