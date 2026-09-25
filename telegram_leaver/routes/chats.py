import asyncio
from flask import Blueprint, jsonify, session, request
from telethon import TelegramClient
from telethon.sessions import StringSession

from ..services.telegram import run_async


chats_bp = Blueprint("chats", __name__)

@chats_bp.route("/api/chats", methods=["GET"])
def get_chats():
    session_string = session.get("telegram_session")
    api_id = session.get("api_id")
    api_hash = session.get("api_hash")

    if not session_string or not api_id or not api_hash:
        return jsonify({"error": "Not logged in"}), 401

    client = TelegramClient(
        StringSession(session_string),
        api_id,
        api_hash,
    )

    async def fetch_chats():
        await client.connect()
        results = []

        async for dialog in client.iter_dialogs():
            if not (dialog.is_group or dialog.is_channel):
                continue

            is_broadcast_channel = (
                dialog.is_channel and not dialog.is_group
            )

            results.append({
                "id": dialog.id,
                "name": dialog.name,
                "type": "channel" if is_broadcast_channel else "group",
                "members": getattr(
                    dialog.entity,
                    "participants_count",
                    0,
                ) or 0,
            })

        await client.disconnect()
        return results

    try:
        chats = run_async(fetch_chats())
    except Exception as error:
        return jsonify({"error": str(error)}), 500

    return jsonify({"chats": chats})

@chats_bp.route("/api/leave", methods=["POST"])
def leave_chats():
    session_string = session.get("telegram_session")
    api_id = session.get("api_id")
    api_hash = session.get("api_hash")

    if not session_string or not api_id or not api_hash:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    chat_ids = data.get("ids", [])

    if not chat_ids:
        return jsonify({"error": "No chats selected"}), 400

    client = TelegramClient(
        StringSession(session_string),
        api_id,
        api_hash,
    )

    async def leave_selected_chats():
        await client.connect()
        results = []

        for chat_id in chat_ids:
            try:
                await client.delete_dialog(chat_id)
                results.append({"id": chat_id, "success": True})
            except Exception as error:
                results.append({
                    "id": chat_id,
                    "success": False,
                    "error": str(error),
                })

            # Avoid sending Telegram requests too quickly.
            await asyncio.sleep(1.5)

        await client.disconnect()
        return results

    try:
        results = run_async(leave_selected_chats())
    except Exception as error:
        return jsonify({"error": str(error)}), 500

    return jsonify({"results": results})
