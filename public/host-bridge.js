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
  let optimisticCaptureAll = false;
  let normalModeActive = false;
  let optimisticNormalMode = false;
  const customHighlightNames = [
    "vimblocks-cursor",
    "vimblocks-visual",
  ];

  const isTextEntry = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.isContentEditable) return true;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
    return ["combobox", "searchbox", "textbox"].includes(
      (target.getAttribute("role") || "").toLowerCase()
    );
  };

  // The window that answered the ready handshake. Everything except that
  // handshake is addressed to it alone: Logseq notes can embed third-party
  // iframes, and fanning captured keystrokes out to every frame would hand
  // them the user's typing.
  let peer = null;

  const broadcastReady = () => {
    const message = { channel, type: "ready" };
    window.postMessage(message, "*");
    for (const frame of document.querySelectorAll("iframe")) {
      frame.contentWindow?.postMessage(message, "*");
    }
  };

  const postToPluginFrames = (message) => {
    if (peer) {
      peer.postMessage({ channel, ...message }, "*");
      return;
    }
    window.postMessage({ channel, ...message }, "*");
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

  const viewportBlockUUIDs = () => {
    const uuids = [];
    const seen = new Set();
    for (const element of document.querySelectorAll('[id^="block-content-"]')) {
      const rect = element.getBoundingClientRect();
      if (
        rect.bottom <= 0 ||
        rect.top >= window.innerHeight ||
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
    if (globalThis.CSS?.highlights) {
      for (const name of customHighlightNames) CSS.highlights.delete(name);
    }
    for (const mark of document.querySelectorAll(
      "mark.vim-shortcuts-highlight"
    )) {
      mark.replaceWith(document.createTextNode(mark.textContent || ""));
    }
  };

  const textNodesFor = (element) => {
    const nodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  };

  const domSegments = (element, offset, length) => {
    const segments = [];
    const endOffset = offset + length;
    let currentOffset = 0;
    for (const node of textNodesFor(element)) {
      const nodeLength = node.textContent?.length || 0;
      const start = Math.max(0, offset - currentOffset);
      const end = Math.min(nodeLength, endOffset - currentOffset);
      if (start < end) segments.push({ node, start, end });
      currentOffset += nodeLength;
      if (currentOffset >= endOffset) break;
    }
    return segments;
  };

  const fallbackHighlightRanges = (ranges) => {
    const segments = ranges.flatMap((item) => {
      const element = document.getElementById(`block-content-${item.uuid}`);
      if (
        !element ||
        element.isContentEditable ||
        element.querySelector('[contenteditable="true"]') ||
        element.closest(".ls-page-title")
      ) return [];
      return domSegments(
        element,
        item.renderedOffset,
        item.renderedLength
      ).map((segment) => ({ ...segment, role: item.role }));
    });
    for (const segment of segments.reverse()) {
      const range = document.createRange();
      range.setStart(segment.node, segment.start);
      range.setEnd(segment.node, segment.end);
      const mark = document.createElement("mark");
      mark.className =
        `vim-shortcuts-highlight vimblocks-${segment.role}`;
      range.surroundContents(mark);
    }
  };

  const highlightRanges = (ranges) => {
    clearAllHighlights();
    const valid = Array.isArray(ranges)
      ? ranges.filter(
          (item) =>
            item &&
            typeof item.uuid === "string" &&
            Number.isFinite(item.renderedOffset) &&
            Number.isFinite(item.renderedLength) &&
            item.renderedLength > 0 &&
            (item.role === "cursor" || item.role === "visual")
        )
      : [];
    if (
      !globalThis.CSS?.highlights ||
      typeof globalThis.Highlight !== "function" ||
      typeof document.createRange !== "function"
    ) {
      fallbackHighlightRanges(valid);
      return;
    }

    const highlights = {
      cursor: new Highlight(),
      visual: new Highlight(),
    };
    for (const item of valid) {
      const element = document.getElementById(`block-content-${item.uuid}`);
      if (
        !element ||
        element.isContentEditable ||
        element.querySelector('[contenteditable="true"]') ||
        element.closest(".ls-page-title")
      ) continue;
      const rect = element.getBoundingClientRect();
      if (item.role === "cursor" && (rect.bottom <= 0 || rect.top >= window.innerHeight)) {
        element.scrollIntoView({ block: "center", inline: "nearest" });
      }
      for (const segment of domSegments(
        element,
        item.renderedOffset,
        item.renderedLength
      )) {
        const range = document.createRange();
        range.setStart(segment.node, segment.start);
        range.setEnd(segment.node, segment.end);
        highlights[item.role].add(range);
      }
    }
    CSS.highlights.set("vimblocks-cursor", highlights.cursor);
    CSS.highlights.set("vimblocks-visual", highlights.visual);
  };

  const highlight = ({ uuid, offset, length, text }) => {
    clearAllHighlights();
    const element = document.getElementById(`block-content-${uuid}`);
    if (!element) return;
    const blockRect = element.getBoundingClientRect();
    if (blockRect.bottom <= 0 || blockRect.top >= window.innerHeight) {
      element.scrollIntoView({ block: "center", inline: "nearest" });
    }

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
    // These are host->plugin only. The ready handshake is broadcast to this
    // window too, so consuming it here would bind the bridge to itself and
    // lock the real plugin frame out.
    if (data.type === "ready" || data.type === "keydown") return;
    if (event.source === window) return;
    // Bind to the first window that answers the handshake, then refuse every
    // other source. Without this, any frame that guesses the channel name can
    // enable blanket capture, read the keystroke stream, or dispose the bridge.
    if (peer) {
      if (event.source !== peer) return;
    } else if (event.source) {
      peer = event.source;
    }
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
      optimisticCaptureAll = false;
    } else if (data.type === "normal-mode") {
      normalModeActive = Boolean(data.value);
      optimisticNormalMode = false;
    } else if (data.type === "clear-highlights") {
      if (Array.isArray(data.uuids)) clearHighlights(data.uuids);
      else clearAllHighlights();
    } else if (data.type === "highlight") {
      highlight(data);
    } else if (data.type === "highlight-ranges") {
      highlightRanges(data.ranges);
    } else if (data.type === "dispose") {
      window[bridgeKey]?.dispose();
    }
  };

  const onKeydown = (event) => {
    const tokenApi = window.__vimblocksKeyToken;
    if (!tokenApi) return;
    if (optimisticNormalMode && event.key !== "Escape") {
      normalModeActive = false;
      optimisticNormalMode = false;
    }
    const token = tokenApi.eventToken(event);
    const pendingCaptureAll = optimisticCaptureAll;
    const effectiveCaptureAll = captureAll || pendingCaptureAll;
    const textEntryActive = isTextEntry(event.target);
    const contentEditable =
      event.target instanceof Element && event.target.isContentEditable;
    const blockEditorActive =
      event.target instanceof Element &&
      (event.target.matches('[data-testid="block editor"]') ||
        event.target.id.startsWith("edit-block-"));
    const blockUUID = blockUUIDForTarget(event.target);
    const shouldCapture = tokenApi.shouldCapture({
      token,
      textEntryActive,
      captureAll: effectiveCaptureAll,
      normalModeActive,
      captureTokens: [...captureTokens],
      normalModeTokens: [...normalModeTokens],
    });
    const shouldForwardEscape = event.key === "Escape";
    const shouldCaptureNormalModeEscape =
      shouldForwardEscape && normalModeActive && !textEntryActive;

    if (!shouldCapture && !shouldForwardEscape) return;
    if (
      shouldCapture &&
      normalModeActive &&
      !effectiveCaptureAll &&
      (
        typeof tokenApi.entersTextEntry === "function"
          ? tokenApi.entersTextEntry(token)
          : ["i", "a", "shift+i", "shift+a", "o", "shift+o"].includes(token)
      )
    ) {
      normalModeActive = false;
      optimisticNormalMode = false;
    }
    if (pendingCaptureAll) optimisticCaptureAll = false;
    if (
      shouldCapture &&
      normalModeActive &&
      !effectiveCaptureAll &&
      typeof tokenApi.startsCaptureAll === "function" &&
      tokenApi.startsCaptureAll(token)
    ) {
      optimisticCaptureAll = true;
    }
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
      viewportBlockUUIDs: viewportBlockUUIDs(),
    };
    if (
      shouldForwardEscape &&
      (contentEditable || blockEditorActive)
    ) {
      normalModeActive = true;
      optimisticNormalMode = true;
      postWhenBlockIsReady(blockUUID, message);
    } else {
      postToPluginFrames(message);
    }
  };

  window.addEventListener("message", onMessage);
  window.addEventListener("keydown", onKeydown, true);
  const releaseCapture = () => {
    captureAll = false;
    optimisticCaptureAll = false;
  };
  window.addEventListener("blur", releaseCapture);
  document.addEventListener("visibilitychange", releaseCapture);

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
      window.removeEventListener("blur", releaseCapture);
      document.removeEventListener("visibilitychange", releaseCapture);
      captureAll = false;
      optimisticCaptureAll = false;
      normalModeActive = false;
      normalModeTokens.clear();
      captureTokens.clear();
      clearAllHighlights();
      peer = null;
    },
  };

  broadcastReady();
})();
