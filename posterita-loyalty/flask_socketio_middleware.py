"""
Flask-SocketIO middleware: intercept and modify server↔client messages,
add timestamps, optional event-name prefixing, and bypass for specific events.
"""
import functools
import logging
from datetime import datetime

from socketio import packet
from socketio.server import SocketIO as BaseSocketIOServer

logger = logging.getLogger(__name__)

# Flag in server emit options to skip middleware for that emit
_SKIP_MIDDLEWARE_FLAG = "__SKIP_MIDDLEWARE__"

# Key in client payload to skip middleware for that event (client sends this)
_SKIP_MIDDLEWARE_KEY = "__SKIP_MIDDLEWARE__"


class SocketIOMiddleware:
    """
    Middleware for Flask-SocketIO that:
    - Server→client: adds timestamp, wraps payload, optional event prefix (e.g. server_),
      with bypass via options in emit().
    - Client→server: adds timestamp and wraps payload before your @socketio.on handlers run;
      handler routing stays by original event name so @socketio.on('my event') still matches;
      optional bypass via skip list or client payload flag.
    - Connect/disconnect: logging.
    """

    def __init__(
        self,
        app=None,
        socketio=None,
        *,
        server_event_prefix="server_",
        client_event_prefix="client_",
        skip_server_events=None,
        skip_client_events=None,
    ):
        self.app = app
        self.socketio = socketio
        self.server_event_prefix = server_event_prefix or ""
        self.client_event_prefix = client_event_prefix or ""
        self.skip_server_events = set(skip_server_events or ())
        self.skip_client_events = set(skip_client_events or ())
        if app is not None and socketio is not None:
            self.init_app(app, socketio)

    def init_app(self, app, socketio):
        self.app = app
        self.socketio = socketio
        logger.info("Initializing SocketIOMiddleware...")
        self._patch_send_packet()
        self._patch_handle_event()
        self._patch_connect_disconnect()
        logger.info("SocketIOMiddleware initialized.")

    def _patch_send_packet(self):
        """Patch server's _send_packet so server→client emits are intercepted."""
        original = BaseSocketIOServer._send_packet

        @functools.wraps(original)
        def wrap_send_packet(self, eio_sid, pkt):
            if pkt.packet_type == packet.EVENT and pkt.data is not None and isinstance(pkt.data, list):
                event_name = pkt.data[0]
                data = pkt.data[1] if len(pkt.data) > 1 else {}
                options = pkt.data[2] if len(pkt.data) > 2 else {}

                mw = wrap_send_packet._middleware
                if event_name in mw.skip_server_events or options.pop(_SKIP_MIDDLEWARE_FLAG, False):
                    logger.debug("Skipping middleware for server event: %s", event_name)
                    return original(self, eio_sid, pkt)
                timestamp = datetime.now().isoformat()
                new_event_name = f"{mw.server_event_prefix}{event_name}"
                new_data = {
                    "timestamp": timestamp,
                    "original_event": event_name,
                    "payload": data,
                }
                pkt.data[0] = new_event_name
                pkt.data[1] = new_data
                if len(pkt.data) > 2:
                    pkt.data[2] = options
                logger.debug("Server event %s -> %s", event_name, new_event_name)
            return original(self, eio_sid, pkt)

        # Store ref for prefix access in closure (middleware instance)
        wrap_send_packet._middleware = self
        BaseSocketIOServer._send_packet = wrap_send_packet
        logger.debug("Patched BaseSocketIOServer._send_packet")

    def _patch_handle_event(self):
        """
        Patch _handle_event so client→server events are modified before handler dispatch.
        We change only the payload (data[1]); event name (data[0]) is unchanged so
        @socketio.on('my event') still matches. Handler receives wrapped payload:
        { timestamp, original_event, modified_event, payload }.
        """
        original = BaseSocketIOServer._handle_event

        @functools.wraps(original)
        def wrap_handle_event(self, eio_sid, namespace, id, data):
            if not isinstance(data, list) or len(data) == 0:
                return original(self, eio_sid, namespace, id, data)

            event_name = data[0]
            mw = wrap_handle_event._middleware

            if event_name in mw.skip_client_events:
                logger.debug("Skipping middleware for client event (skip list): %s", event_name)
                return original(self, eio_sid, namespace, id, data)

            payload = data[1] if len(data) > 1 else {}
            if isinstance(payload, dict) and payload.pop(_SKIP_MIDDLEWARE_KEY, False):
                logger.debug("Skipping middleware for client event (payload flag): %s", event_name)
                if len(data) > 1:
                    data[1] = payload
                return original(self, eio_sid, namespace, id, data)

            timestamp = datetime.now().isoformat()
            modified_event_name = f"{mw.client_event_prefix}{event_name}"
            new_payload = {
                "timestamp": timestamp,
                "original_event": event_name,
                "modified_event": modified_event_name,
                "payload": payload,
            }
            # Keep data[0] as original event name so handler lookup still finds @socketio.on('my event')
            data = [event_name, new_payload]
            logger.debug("Client event %s wrapped (modified_event=%s)", event_name, modified_event_name)
            return original(self, eio_sid, namespace, id, data)

        wrap_handle_event._middleware = self
        BaseSocketIOServer._handle_event = wrap_handle_event
        logger.debug("Patched BaseSocketIOServer._handle_event")

    def _patch_connect_disconnect(self):
        """Patch connect/disconnect for logging."""
        original_connect = BaseSocketIOServer._handle_connect
        original_disconnect = BaseSocketIOServer._handle_disconnect

        @functools.wraps(original_connect)
        def wrap_connect(self, eio_sid, namespace, data):
            logger.info("Client connecting: eio_sid=%s namespace=%s", eio_sid, namespace or "/")
            return original_connect(self, eio_sid, namespace, data)

        @functools.wraps(original_disconnect)
        def wrap_disconnect(self, eio_sid, namespace, reason=None):
            logger.info("Client disconnecting: eio_sid=%s namespace=%s reason=%s", eio_sid, namespace or "/", reason)
            return original_disconnect(self, eio_sid, namespace, reason)

        BaseSocketIOServer._handle_connect = wrap_connect
        BaseSocketIOServer._handle_disconnect = wrap_disconnect
        logger.debug("Patched _handle_connect and _handle_disconnect")


def bypass_middleware_for_emit():
    """
    Return options dict to bypass server-side middleware for one emit.
    Use only if your emit path supports passing through optional kwargs
    that reach _send_packet (e.g. some custom wrapper). Prefer
    skip_server_events for known event names.
    """
    return {_SKIP_MIDDLEWARE_FLAG: True}
