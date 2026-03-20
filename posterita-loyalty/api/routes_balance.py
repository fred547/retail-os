"""
GET /api/v1/balance/{phone}
Returns loyalty wallet balance and active vouchers for a phone number.
"""
import logging
from datetime import datetime
from flask import Blueprint, jsonify
from api.zoho_client import zoho

log = logging.getLogger(__name__)
bp = Blueprint("balance", __name__)


@bp.route("/api/v1/balance/<phone>", methods=["GET"])
def get_balance(phone):
    phone = _normalize(phone)
    if not phone:
        return jsonify({"error": "Invalid phone number"}), 400

    # Get wallet
    wallet = _get_wallet(phone)
    points = 0
    tier = None
    if wallet:
        points = int(wallet.get("Wallet_Balance", 0))

    # Get active vouchers
    vouchers = _get_active_vouchers(phone)

    return jsonify({
        "phone": phone,
        "points": points,
        "tier": tier,
        "activeVouchers": vouchers,
    })


def _get_wallet(phone):
    """Fetch Points_Wallet record for a phone number."""
    records = zoho.get_records(
        "Points_Wallet_Report",
        criteria=f'(Phone_Number == "{phone}")',
        max_records=1,
    )
    return records[0] if records else None


def _get_active_vouchers(phone):
    """Fetch active (issued, not expired/redeemed) vouchers for a phone."""
    now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    records = zoho.get_records(
        "Voucher_Issuance_Report",
        criteria=(
            f'(Phone_Number == "{phone}" '
            f'&& Voucher_Status == "issued")'
        ),
        max_records=20,
    )
    vouchers = []
    for r in records:
        # Skip expired
        expires = r.get("Expires_At", "")
        if expires and expires < now_str:
            continue
        vouchers.append({
            "voucherId": r.get("ID", ""),
            "code": r.get("Voucher_Code", ""),
            "description": r.get("Campaign_Code", ""),
            "discountType": _map_reward_type(r.get("Reward_Type", "")),
            "discountValue": float(r.get("Reward_Value", 0)),
            "minOrderAmount": 0.0,
            "expiryDate": expires,
            "isUsed": False,
        })
    return vouchers


def _map_reward_type(reward_type):
    """Map Creator reward type to POS discount type."""
    if reward_type in ("percent_discount",):
        return "PERCENTAGE"
    return "FIXED"


def _normalize(phone):
    """Strip spaces/dashes, ensure starts with +."""
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone:
        return ""
    if not phone.startswith("+"):
        phone = f"+{phone}"
    return phone
