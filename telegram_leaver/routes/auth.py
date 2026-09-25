import asyncio
import uuid
from telethon import TelegramClient
from telethon.errors import FloodWaitError, PhoneNumberInvalidError
from telethon.sessions import StringSession
from ..services.telegram import pending_logins
from flask import Blueprint, jsonify, request, session
from telethon.errors import (
    FloodWaitError,
    PhoneCodeExpiredError,
    PhoneCodeInvalidError,
    PhoneNumberInvalidError,
    SessionPasswordNeededError,
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/set-credentials", methods=["POST"])
def set_credentials():
    data = request.get_json()
    api_id = data.get("apiId", "").strip()
    api_hash = data.get("apiHash", "").strip()

    if not api_id.isdigit():
        return jsonify({"error": "API ID must be numeric"}), 400
    if len(api_hash) < 20:
        return jsonify({"error": "API Hash looks invalid"}), 400

    session["api_id"] = int(api_id)
    session["api_hash"] = api_hash

    return jsonify({"success": True})

@auth_bp.route("/api/send-code", methods=["POST"])
def send_code():
    api_id = session.get("api_id")
    api_hash = session.get("api_hash")

    if not api_id or not api_hash:
        return jsonify({"error": "Submit your API ID and Hash first"}), 400

    data = request.get_json()
    phone = data.get("phone", "").strip()

    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    login_id = str(uuid.uuid4())
    loop = asyncio.new_event_loop()
    client = TelegramClient(StringSession(), api_id, api_hash)

    async def send_telegram_code():
        await client.connect()
        return await client.send_code_request(phone)

    try:
        result = loop.run_until_complete(send_telegram_code())
    except PhoneNumberInvalidError:
        loop.close()
        return jsonify({"error": "That phone number is invalid"}), 400
    except FloodWaitError as error:
        loop.close()
        return jsonify({
            "error": f"Too many attempts. Try again in {error.seconds} seconds"
        }), 429

    pending_logins[login_id] = {
        "client": client,
        "phone": phone,
        "phone_code_hash": result.phone_code_hash,
        "loop": loop,
    }
    session["login_id"] = login_id

    return jsonify({"success": True})

@auth_bp.route("/api/verify-code", methods=["POST"])
def verify_code():
    login_id = session.get("login_id")
    entry = pending_logins.get(login_id)

    if not entry:
        return jsonify({
            "error": "No login in progress. Please request a new code"
        }), 400

    data = request.get_json()
    code = data.get("code", "").strip()
    password = data.get("password", "").strip()

    if not code:
        return jsonify({"error": "Code is required"}), 400

    client = entry["client"]
    phone = entry["phone"]
    phone_code_hash = entry["phone_code_hash"]
    loop = entry["loop"]

    async def verify_telegram_code():
        await client.sign_in(
            phone=phone,
            code=code,
            phone_code_hash=phone_code_hash,
        )

    try:
        loop.run_until_complete(verify_telegram_code())
    except PhoneCodeInvalidError:
        return jsonify({"error": "That code is incorrect"}), 400
    except PhoneCodeExpiredError:
        return jsonify({
            "error": "That code has expired. Please request a new one"
        }), 400
    except SessionPasswordNeededError:
        if not password:
            return jsonify({
                "error": "2FA password required",
                "needs_password": True,
            }), 401

        async def verify_two_factor_password():
            await client.sign_in(password=password)

        try:
            loop.run_until_complete(verify_two_factor_password())
        except Exception:
            return jsonify({"error": "Incorrect 2FA password"}), 400

    session["telegram_session"] = client.session.save()
    loop.close()
    del pending_logins[login_id]

    return jsonify({"success": True})