"""
Example Flask-SocketIO app with SocketIOMiddleware.
Handlers stay registered with original event names; they receive wrapped payloads.
"""
import logging
from flask import Flask
from flask_socketio import SocketIO, emit

from flask_socketio_middleware import SocketIOMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
socketio = SocketIO(app)

# Apply middleware: all events wrapped by default; optional skip lists
middleware = SocketIOMiddleware(
    app,
    socketio,
    server_event_prefix="server_",
    client_event_prefix="client_",
    skip_server_events=(),   # e.g. ("heartbeat",) to leave some events unwrapped
    skip_client_events=(),    # e.g. ("ping",) to leave some client events unwrapped
)


# Handlers use original event names. They receive the middleware payload shape:
# - Server→client: client receives { "timestamp", "original_event", "payload": <your data> }, event name prefixed (e.g. server_my response).
# - Client→server: handler gets one arg = { "timestamp", "original_event", "modified_event", "payload": <client data> }.
@socketio.on("my event")
def test_message(message):
    # message = { "timestamp", "original_event", "modified_event", "payload": <what client sent> }
    data = message.get("payload", message) if isinstance(message, dict) else message
    emit("my response", {"data": data.get("data", data)})


@socketio.on("my broadcast event")
def test_broadcast_message(message):
    payload = message.get("payload", message) if isinstance(message, dict) else message
    emit("my response", {"data": payload.get("data", payload)}, broadcast=True)


@socketio.on("connect")
def test_connect(auth=None):
    emit("my response", {"data": "Connected", "count": 0})


@socketio.on("disconnect")
def test_disconnect():
    print("Client disconnected")


if __name__ == "__main__":
    socketio.run(app, debug=True)
