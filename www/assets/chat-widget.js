(function () {
  "use strict";

  var API_URL = "https://web.posterita.com/api/marketing/chat";
  var SESSION_KEY = "posterita_chat_session";
  var BRAND_BLUE = "#2563eb";
  var BRAND_BLUE_DARK = "#1d4ed8";

  function getSessionId() {
    var id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "chat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function createWidget() {
    // --- Styles ---
    var style = document.createElement("style");
    style.textContent = [
      "#pcw-bubble{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:" + BRAND_BLUE + ";color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 14px rgba(37,99,235,.4);z-index:99999;transition:transform .2s,background .2s;border:none;outline:none;}",
      "#pcw-bubble:hover{transform:scale(1.08);background:" + BRAND_BLUE_DARK + ";}",
      "#pcw-bubble svg{width:28px;height:28px;}",
      "#pcw-panel{position:fixed;bottom:88px;right:20px;width:350px;height:500px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:99999;display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif;}",
      "#pcw-header{background:" + BRAND_BLUE + ";color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}",
      "#pcw-header h3{margin:0;font-size:15px;font-weight:600;}",
      "#pcw-header span{font-size:12px;opacity:.8;}",
      "#pcw-close{background:none;border:none;color:#fff;cursor:pointer;font-size:20px;line-height:1;padding:0 4px;opacity:.8;}",
      "#pcw-close:hover{opacity:1;}",
      "#pcw-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;}",
      ".pcw-msg{max-width:82%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.45;word-wrap:break-word;}",
      ".pcw-msg-user{background:" + BRAND_BLUE + ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}",
      ".pcw-msg-assistant{background:#f1f5f9;color:#1e293b;align-self:flex-start;border-bottom-left-radius:4px;}",
      ".pcw-typing{align-self:flex-start;background:#f1f5f9;border-radius:14px;padding:10px 18px;display:none;}",
      ".pcw-typing span{display:inline-block;width:7px;height:7px;background:#94a3b8;border-radius:50%;margin:0 2px;animation:pcw-bounce .6s infinite alternate;}",
      ".pcw-typing span:nth-child(2){animation-delay:.2s;}",
      ".pcw-typing span:nth-child(3){animation-delay:.4s;}",
      "@keyframes pcw-bounce{to{transform:translateY(-6px);opacity:.4;}}",
      "#pcw-input-wrap{display:flex;border-top:1px solid #e2e8f0;padding:8px;flex-shrink:0;gap:6px;}",
      "#pcw-input{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;font-size:13.5px;outline:none;font-family:inherit;resize:none;}",
      "#pcw-input:focus{border-color:" + BRAND_BLUE + ";box-shadow:0 0 0 2px rgba(37,99,235,.15);}",
      "#pcw-send{background:" + BRAND_BLUE + ";color:#fff;border:none;border-radius:10px;padding:8px 14px;cursor:pointer;font-size:13.5px;font-weight:600;font-family:inherit;transition:background .15s;}",
      "#pcw-send:hover{background:" + BRAND_BLUE_DARK + ";}",
      "#pcw-send:disabled{opacity:.5;cursor:default;}",
      "@media(max-width:480px){#pcw-panel{width:calc(100vw - 16px);height:calc(100vh - 120px);right:8px;bottom:80px;border-radius:12px;}}",
    ].join("\n");
    document.head.appendChild(style);

    // --- Bubble ---
    var bubble = document.createElement("button");
    bubble.id = "pcw-bubble";
    bubble.setAttribute("aria-label", "Chat with us");
    bubble.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    document.body.appendChild(bubble);

    // --- Panel ---
    var panel = document.createElement("div");
    panel.id = "pcw-panel";
    panel.innerHTML = [
      '<div id="pcw-header">',
      '  <div><h3>Posterita Assistant</h3><span>Ask about our POS system</span></div>',
      '  <button id="pcw-close">&times;</button>',
      "</div>",
      '<div id="pcw-messages">',
      '  <div class="pcw-msg pcw-msg-assistant">Hi! I\'m the Posterita assistant. How can I help you today? Ask me about our POS features, pricing, or anything else.</div>',
      "</div>",
      '<div class="pcw-typing" id="pcw-typing"><span></span><span></span><span></span></div>',
      '<div id="pcw-input-wrap">',
      '  <input id="pcw-input" type="text" placeholder="Type a message..." autocomplete="off" />',
      '  <button id="pcw-send">Send</button>',
      "</div>",
    ].join("");
    document.body.appendChild(panel);

    // --- Elements ---
    var messagesEl = document.getElementById("pcw-messages");
    var inputEl = document.getElementById("pcw-input");
    var sendBtn = document.getElementById("pcw-send");
    var typingEl = document.getElementById("pcw-typing");
    var closeBtn = document.getElementById("pcw-close");
    var isOpen = false;
    var isSending = false;

    // --- Toggle ---
    bubble.addEventListener("click", function () {
      isOpen = !isOpen;
      panel.style.display = isOpen ? "flex" : "none";
      if (isOpen) inputEl.focus();
    });

    closeBtn.addEventListener("click", function () {
      isOpen = false;
      panel.style.display = "none";
    });

    // --- Append message ---
    function appendMessage(role, text) {
      var div = document.createElement("div");
      div.className = "pcw-msg pcw-msg-" + role;
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // --- Send ---
    function sendMessage() {
      var text = inputEl.value.trim();
      if (!text || isSending) return;

      appendMessage("user", text);
      inputEl.value = "";
      isSending = true;
      sendBtn.disabled = true;
      typingEl.style.display = "block";
      messagesEl.scrollTop = messagesEl.scrollHeight;

      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: getSessionId(),
          message: text,
        }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          typingEl.style.display = "none";
          if (data.response) {
            appendMessage("assistant", data.response);
          } else {
            appendMessage(
              "assistant",
              data.error || "Sorry, something went wrong. Please try again."
            );
          }
        })
        .catch(function () {
          typingEl.style.display = "none";
          appendMessage(
            "assistant",
            "Network error. Please check your connection and try again."
          );
        })
        .finally(function () {
          isSending = false;
          sendBtn.disabled = false;
          inputEl.focus();
        });
    }

    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
