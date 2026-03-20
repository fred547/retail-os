"""
POST /api/v1/award
Awards loyalty points for a POS order.
Idempotent on orderUuid — duplicate awards are rejected.
"""
import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from api.zoho_client import zoho
from api import config

log = logging.getLogger(__name__)
bp = Blueprint("award", __name__)


@bp.route("/api/v1/award", methods=["POST"])
def award_points():
    data = request.get_json(silent=True) or {}
    phone = _normalize(data.get("phone", ""))
    order_uuid = data.get("orderUuid", "")
    order_total = float(data.get("orderTotal", 0))
    currency = data.get("currency", config.LOYALTY_CURRENCY)
    store_id = data.get("storeId", 0)
    terminal_id = data.get("terminalId", 0)

    if not phone or not order_uuid:
        return jsonify({"error": "phone and orderUuid are required"}), 400

    if order_total <= 0:
        return jsonify({"error": "orderTotal must be positive"}), 400

    # Check for duplicate claim (idempotent on orderUuid)
    unique_key = f"POS::{order_uuid}"
    existing = zoho.get_records(
        "Order_Points_Claims_Report",
        criteria=f'(Unique_Claim_Key == "{unique_key}")',
        max_records=1,
    )
    if existing:
        # Already processed — return success with existing data (idempotent)
        rec = existing[0]
        wallet = _get_wallet(phone)
        return jsonify({
            "phone": phone,
            "pointsAwarded": int(rec.get("Points_Credited", 0)),
            "newBalance": int(wallet.get("Wallet_Balance", 0)) if wallet else 0,
            "transactionId": rec.get("ID", ""),
        })

    # Calculate points
    points = int(order_total / config.LOYALTY_POINTS_PER_UNIT)
    if points <= 0:
        points = 1  # Minimum 1 point per transaction

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")

    # Create Order_Points_Claims record
    claim = zoho.create_record("Order_Points_Claims", {
        "Phone_Number": phone,
        "Order_Number": f"POS-{store_id}-{terminal_id}",
        "Order_ID": order_uuid,
        "Unique_Claim_Key": unique_key,
        "Claimed_Total": order_total,
        "Posterita_Total": order_total,
        "Total_Match": True,
        "Validation_Status": "validated",
        "Claim_Status": "approved",
        "Points_To_Credit": points,
        "Points_Credited": points,
        "Claimed_At": now,
        "Processed_At": now,
    })

    if not claim:
        return jsonify({"error": "Failed to create claim record"}), 500

    # Get or create wallet
    wallet = _get_wallet(phone)
    if wallet:
        old_balance = int(wallet.get("Wallet_Balance", 0))
        lifetime_earned = int(wallet.get("Lifetime_Earned", 0))
        new_balance = old_balance + points
        zoho.update_record("Points_Wallet_Report", wallet["ID"], {
            "Wallet_Balance": new_balance,
            "Lifetime_Earned": lifetime_earned + points,
            "Last_Updated_At": now,
            "Last_Source": "pos_order",
            "Last_Reference": order_uuid,
        })
    else:
        new_balance = points
        zoho.create_record("Points_Wallet", {
            "Phone_Number": phone,
            "Wallet_Balance": new_balance,
            "Lifetime_Earned": points,
            "Lifetime_Redeemed": 0,
            "Wallet_Status": "active",
            "Last_Updated_At": now,
            "Last_Source": "pos_order",
            "Last_Reference": order_uuid,
        })

    # Create transaction ledger entry
    zoho.create_record("Points_Transaction_Ledger", {
        "Phone_Number": phone,
        "Transaction_Type": "order_earn",
        "Reference_Number": order_uuid,
        "Points_Delta": points,
        "Points_Balance_After": new_balance,
        "Transaction_Timestamp": now,
        "Source_Type": "posterita_pos",
        "Notes": f"Earned from POS order {order_uuid}, total {currency} {order_total}",
    })

    return jsonify({
        "phone": phone,
        "pointsAwarded": points,
        "newBalance": new_balance,
        "transactionId": claim.get("ID", "") if isinstance(claim, dict) else "",
    })


def _get_wallet(phone):
    records = zoho.get_records(
        "Points_Wallet_Report",
        criteria=f'(Phone_Number == "{phone}")',
        max_records=1,
    )
    return records[0] if records else None


def _normalize(phone):
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone:
        return ""
    if not phone.startswith("+"):
        phone = f"+{phone}"
    return phone
