(() => {
  const bridgeKey = "__vimblocksHostBridge";
  const channel = "vimblocks-host-bridge-v1";

  if (window[bridgeKey]) {
    window[bridgeKey].dispose();
  }

  const captureTokens = new Set();
  const normalModeTokens = new Set();
  const pendingObservers = new Set();
  let captureAll = false;
  let normalModeActive = false;

  const isTextEntry = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.isContentEditable) return true;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
    return ["combobox", "searchbox", "textbox"].includes(
      (target.getAttribute("role") || "").toLowerCase()
    );
  };

  const eventToken = (event) => {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push("ctrl");
    if (event.metaKey) modifiers.push("meta");
    if (event.altKey) modifiers.push("alt");
    if (event.shiftKey && event.key.length > 1) modifiers.push("shift");
    const key =
      event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
    return [...modifiers, key].join("+");
  };

  const postToPluginFrames = (message) => {
    window.postMessage({ channel, ...message }, "*");
    for (const frame of document.querySelectorAll("iframe")) {
      frame.contentWindow?.postMessage({ channel, ...message }, "*");
    }
  };

  const blockUUIDForTarget = (target) => {
    if (!(target instanceof Element)) return undefined;
    const blockContent = target.closest('[id^="block-content-"]');
    if (blockContent?.id) {
      return blockContent.id.substring("block-content-".length);
    }

    const block = target.closest("[blockid], [data-uuid]");
    return (
      block?.getAttribute("blockid") ||
      block?.getAttribute("data-uuid") ||
      undefined
    );
  };

  const visibleBlockUUIDs = () => {
    const uuids = [];
    const seen = new Set();
    for (const element of document.querySelectorAll('[id^="block-content-"]')) {
      if (
        element.getClientRects().length === 0 ||
        element.closest(".ls-page-title")
      ) {
        continue;
      }
      const uuid = element.id.substring("block-content-".length);
      if (!uuid || seen.has(uuid)) continue;
      seen.add(uuid);
      uuids.push(uuid);
    }
    return uuids;
  };

  const blockIsReady = (uuid) => {
    const element = document.getElementById(`block-content-${uuid}`);
    const block =
      element?.closest("[blockid], [data-uuid], .ls-block") || element;
    return (
      element &&
      block &&
      !block.isContentEditable &&
      !block.querySelector('[contenteditable="true"]')
    );
  };

  const postWhenBlockIsReady = (uuid, message) => {
    if (!uuid || blockIsReady(uuid)) {
      postToPluginFrames(message);
      return;
    }

    const observer = new MutationObserver(() => {
      if (!blockIsReady(uuid)) return;
      observer.disconnect();
      pendingObservers.delete(observer);
      postToPluginFrames(message);
    });
    pendingObservers.add(observer);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["contenteditable"],
    });
  };

  const clearHighlights = (uuids) => {
    for (const uuid of uuids) {
      const element = document.getElementById(`block-content-${uuid}`);
      if (!element) continue;
      for (const mark of element.querySelectorAll("mark.vim-shortcuts-highlight")) {
        mark.replaceWith(document.createTextNode(mark.textContent || ""));
      }
      element.normalize();
    }
  };

  const clearAllHighlights = () => {
    for (const mark of document.querySelectorAll(
      "mark.vim-shortcuts-highlight"
    )) {
      mark.replaceWith(document.createTextNode(mark.textContent || ""));
    }
  };

  const highlight = ({ uuid, offset, length, text }) => {
    clearAllHighlights();
    const element = document.getElementById(`block-content-${uuid}`);
    if (!element) return;

    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT
    );
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    let targetOffset = offset;
    if (typeof targetOffset !== "number") {
      const rendered = textNodes.map((item) => item.textContent || "").join("");
      targetOffset = rendered.toLowerCase().indexOf((text || "").toLowerCase());
    }
    if (targetOffset < 0) return;

    let currentOffset = 0;
    for (const textNode of textNodes) {
      const nodeLength = textNode.textContent?.length || 0;
      if (
        targetOffset >= currentOffset &&
        targetOffset < currentOffset + nodeLength
      ) {
        const start = targetOffset - currentOffset;
        const end = Math.min(start + length, nodeLength);
        const before = textNode.textContent?.substring(0, start) || "";
        const match = textNode.textContent?.substring(start, end) || "";
        const after = textNode.textContent?.substring(end) || "";
        const mark = document.createElement("mark");
        mark.className = "vim-shortcuts-highlight";
        mark.textContent = match;
        const fragment = document.createDocumentFragment();
        if (before) fragment.appendChild(document.createTextNode(before));
        fragment.appendChild(mark);
        if (after) fragment.appendChild(document.createTextNode(after));
        textNode.parentNode?.replaceChild(fragment, textNode);
        return;
      }
      currentOffset += nodeLength;
    }
  };

  const onMessage = (event) => {
    const data = event.data;
    if (!data || data.channel !== channel) return;
    if (data.type === "configure") {
      captureTokens.clear();
      for (const token of data.tokens || []) captureTokens.add(token);
      normalModeTokens.clear();
      for (const token of data.normalModeTokens || []) {
        normalModeTokens.add(token);
      }
      captureAll = Boolean(data.captureAll);
      normalModeActive = Boolean(data.normalModeActive);
    } else if (data.type === "capture-all") {
      captureAll = Boolean(data.value);
    } else if (data.type === "normal-mode") {
      normalModeActive = Boolean(data.value);
    } else if (data.type === "clear-highlights") {
      clearHighlights(data.uuids || []);
    } else if (data.type === "highlight") {
      highlight(data);
    }
  };

  const onKeydown = (event) => {
    const token = eventToken(event);
    const textEntryActive = isTextEntry(event.target);
    const contentEditable =
      event.target instanceof Element && event.target.isContentEditable;
    const blockEditorActive =
      event.target instanceof Element &&
      (event.target.matches('[data-testid="block editor"]') ||
        event.target.id.startsWith("edit-block-"));
    const blockUUID = blockUUIDForTarget(event.target);
    const shouldCapture =
      !textEntryActive &&
      (captureAll ||
        captureTokens.has(token) ||
        (normalModeActive && normalModeTokens.has(token)));
    const shouldForwardEscape = event.key === "Escape";
    const shouldCaptureNormalModeEscape =
      shouldForwardEscape && normalModeActive && !textEntryActive;

    if (!shouldCapture && !shouldForwardEscape) return;
    if (shouldCapture || shouldCaptureNormalModeEscape) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const message = {
      type: "keydown",
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      repeat: event.repeat,
      isComposing: event.isComposing,
      textEntryActive,
      contentEditable,
      blockEditorActive,
      blockUUID,
      visibleBlockUUIDs: visibleBlockUUIDs(),
    };
    if (
      shouldForwardEscape &&
      (contentEditable || blockEditorActive)
    ) {
      postWhenBlockIsReady(blockUUID, message);
    } else {
      postToPluginFrames(message);
    }
  };

  window.addEventListener("message", onMessage);
  window.addEventListener("keydown", onKeydown, true);

  window[bridgeKey] = {
    get captureAll() {
      return captureAll;
    },
    get captureTokens() {
      return [...captureTokens];
    },
    dispose() {
      for (const observer of pendingObservers) observer.disconnect();
      pendingObservers.clear();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKeydown, true);
    },
  };

  postToPluginFrames({ type: "ready" });
})();
