"""
POST /api/v1/voucher/validate
POST /api/v1/voucher/redeem
Validates and redeems loyalty vouchers.
"""
import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from api.zoho_client import zoho

log = logging.getLogger(__name__)
bp = Blueprint("voucher", __name__)


@bp.route("/api/v1/voucher/validate", methods=["POST"])
def validate_voucher():
    code = request.args.get("code", "").strip()
    phone = _normalize(request.args.get("phone", ""))

    if not code or not phone:
        return jsonify({"error": "code and phone are required"}), 400

    voucher = _find_voucher(code, phone)
    if not voucher:
        return jsonify({
            "voucherId": "",
            "valid": False,
            "discountType": None,
            "discountValue": 0,
            "message": "Voucher not found or does not belong to this customer",
        })

    # Check status
    status = voucher.get("Voucher_Status", "")
    if status != "issued":
        return jsonify({
            "voucherId": voucher.get("ID", ""),
            "valid": False,
            "discountType": None,
            "discountValue": 0,
            "message": f"Voucher is {status}",
        })

    # Check expiry
    expires = voucher.get("Expires_At", "")
    if expires:
        now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        if expires < now_str:
            return jsonify({
                "voucherId": voucher.get("ID", ""),
                "valid": False,
                "discountType": None,
                "discountValue": 0,
                "message": "Voucher has expired",
            })

    reward_type = voucher.get("Reward_Type", "fixed_discount")
    discount_type = "PERCENTAGE" if reward_type == "percent_discount" else "FIXED"
    discount_value = float(voucher.get("Reward_Value", 0))

    return jsonify({
        "voucherId": voucher.get("ID", ""),
        "valid": True,
        "discountType": discount_type,
        "discountValue": discount_value,
        "message": f"Voucher valid: {voucher.get('Voucher_Code', '')}",
    })


@bp.route("/api/v1/voucher/redeem", methods=["POST"])
def redeem_voucher():
    code = request.args.get("code", "").strip()
    phone = _normalize(request.args.get("phone", ""))
    order_uuid = request.args.get("order_uuid", "").strip()

    if not code or not phone or not order_uuid:
        return jsonify({"error": "code, phone, and order_uuid are required"}), 400

    voucher = _find_voucher(code, phone)
    if not voucher:
        return jsonify({
            "voucherId": "",
            "redeemed": False,
            "discountApplied": 0,
            "message": "Voucher not found",
        }), 404

    if voucher.get("Voucher_Status") != "issued":
        return jsonify({
            "voucherId": voucher.get("ID", ""),
            "redeemed": False,
            "discountApplied": 0,
            "message": f"Voucher is {voucher.get('Voucher_Status', 'unknown')}",
        }), 400

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    discount_value = float(voucher.get("Reward_Value", 0))

    # Mark voucher as redeemed
    zoho.update_record("Voucher_Issuance_Report", voucher["ID"], {
        "Voucher_Status": "redeemed",
        "Redeemed_At": now,
        "Order_Reference": order_uuid,
    })

    # Log redemption
    zoho.create_record("Voucher_Redemption_Log", {
        "Voucher_Code": code,
        "Phone_Number": phone,
        "Redeemed_At": now,
        "Order_Reference": order_uuid,
        "Reward_Type": voucher.get("Reward_Type", ""),
        "Reward_Value": discount_value,
        "Redemption_Source": "posterita_pos",
    })

    return jsonify({
        "voucherId": voucher.get("ID", ""),
        "redeemed": True,
        "discountApplied": discount_value,
        "message": "Voucher redeemed successfully",
    })


def _find_voucher(code, phone):
    """Find a voucher by code and phone number."""
    records = zoho.get_records(
        "Voucher_Issuance_Report",
        criteria=f'(Voucher_Code == "{code}" && Phone_Number == "{phone}")',
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
