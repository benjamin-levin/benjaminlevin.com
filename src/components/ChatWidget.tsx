"use client";
import { useState, useEffect, useRef, useCallback } from "react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

const SUGGESTIONS = [
  "What's PRSM?",
  "Tell me about Ben's work at Tesla",
  "What did Ben do at Formulatrix?",
  "What's the most technically interesting project?",
  "How can I contact Ben?",
];

export default function ChatWidget() {
  const Z = 2147483647;
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isHidden, setIsHidden] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [dimensions, setDimensions] = useState({ width: 380, height: 540 });
  const [isResizing, setIsResizing] = useState(false);
  const isMobile = useIsMobile();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [mobileHeight, setMobileHeight] = useState("100vh");
  const [mobileTop, setMobileTop] = useState(0);
  const savedScrollRef = useRef(0);

  useEffect(() => {
    if (isMobile && isOpen) {
      savedScrollRef.current = window.scrollY;
      window.scrollTo(0, 0);
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = "0";
      document.body.style.left = "0";
      document.body.style.right = "0";
      const cleanup = () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        window.scrollTo(0, savedScrollRef.current);
      };
      const vv = window.visualViewport;
      if (vv) {
        const onViewport = () => {
          setMobileHeight(`${vv.height}px`);
          setMobileTop(vv.offsetTop);
        };
        onViewport();
        vv.addEventListener("resize", onViewport);
        vv.addEventListener("scroll", onViewport);
        return () => {
          vv.removeEventListener("resize", onViewport);
          vv.removeEventListener("scroll", onViewport);
          cleanup();
        };
      }
      return cleanup;
    }
  }, [isMobile, isOpen]);

  const startResizing = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    resizeRef.current = {
      startX: e.clientX, startY: e.clientY,
      startW: dimensions.width, startH: dimensions.height,
    };
    setIsResizing(true);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;
      const dx = resizeRef.current.startX - e.clientX;
      const dy = resizeRef.current.startY - e.clientY;
      setDimensions({
        width: Math.max(320, Math.min(resizeRef.current.startW + dx, window.innerWidth * 0.9)),
        height: Math.max(420, Math.min(resizeRef.current.startH + dy, window.innerHeight * 0.85)),
      });
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [input]);

  useEffect(() => {
    let sid = localStorage.getItem("blevin_chat_session");
    if (!sid) {
      sid = "session_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("blevin_chat_session", sid);
    }
    setSessionId(sid);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/chat/health");
        if (!cancelled) setIsHidden(!res.ok);
      } catch {
        if (!cancelled) setIsHidden(true);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 3600000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const send = useCallback(async (override?: string) => {
    const userMessage = (override ?? input).trim();
    if (!userMessage || isLoading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage, sessionId }),
      });

      if (!response.ok) {
        setMessages((prev) => [...prev, { role: "bot", content: "Sorry, the assistant is unavailable right now." }]);
        setIsUnavailable(true);
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      setMessages((prev) => [...prev, { role: "bot", content: "" }]);

      if (reader) {
        let full = "";
        const showUnavailable = () => {
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const last = prev.length - 1;
            return [...prev.slice(0, last), { role: "bot" as const, content: "Sorry, the assistant is unavailable right now." }];
          });
          setIsUnavailable(true);
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          full += chunk;
          if (full.includes("[Error")) {
            reader.cancel();
            showUnavailable();
            break;
          }
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const last = prev.length - 1;
            const m = prev[last];
            return [...prev.slice(0, last), { ...m, content: m.content + chunk }];
          });
        }
        if (!full.trim()) showUnavailable();
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "bot", content: "Sorry, the assistant is unavailable right now." }]);
      setIsUnavailable(true);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId]);

  // Suppress zoom inside the chat panel. `touch-action` (set via the
  // .no-pinch-zoom class) covers Chrome/Android, but iOS Safari ignores it for
  // pinch — so also block its proprietary gesture events and any two-finger
  // touchmove. Scoped to the panel: the rest of the site keeps pinch-to-zoom.
  useEffect(() => {
    const el = panelRef.current;
    if (!isOpen || !el) return;
    const block = (e: Event) => e.preventDefault();
    const blockMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    // `gesture*` are WebKit-only and absent from HTMLElementEventMap, so go
    // through the untyped EventTarget surface for those.
    const webkit: EventTarget = el;
    const GESTURES = ["gesturestart", "gesturechange", "gestureend"];
    for (const g of GESTURES) webkit.addEventListener(g, block);
    el.addEventListener("touchmove", blockMultiTouch, { passive: false });
    return () => {
      for (const g of GESTURES) webkit.removeEventListener(g, block);
      el.removeEventListener("touchmove", blockMultiTouch);
    };
  }, [isOpen]);

  if (isHidden) return null;

  const fabStyle: React.CSSProperties = {
    position: "fixed",
    bottom: isMobile ? "1.25rem" : "2rem",
    right: isMobile ? "1.25rem" : "2rem",
    width: 56, height: 56, borderRadius: "50%",
    background: isUnavailable && !isOpen ? "#3a3a3a" : "linear-gradient(135deg, #6366f1, #ec4899)",
    color: "white", border: "none",
    cursor: isUnavailable && !isOpen ? "not-allowed" : "pointer",
    zIndex: Z,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
    fontSize: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    pointerEvents: "auto", touchAction: "manipulation",
    opacity: isUnavailable && !isOpen ? 0.5 : 1,
  };

  const mobileWindow: React.CSSProperties = {
    position: "fixed",
    top: `${mobileTop}px`, left: 0, width: "100vw", height: mobileHeight,
    background: "#0b0b0d",
    display: "flex", flexDirection: "column",
    zIndex: Z - 1,
    overscrollBehavior: "contain", touchAction: "none", pointerEvents: "auto",
  };

  const desktopWindow: React.CSSProperties = {
    position: "fixed",
    bottom: "6rem", right: "2rem",
    width: dimensions.width, height: dimensions.height,
    background: "#0b0b0d",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
    display: "flex", flexDirection: "column",
    zIndex: Z - 1,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)",
    overflow: "hidden",
    transition: isResizing ? "none" : "width 0.1s, height 0.1s",
    pointerEvents: "auto", touchAction: "pan-x pan-y",
  };

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: Z }}>
      {!(isMobile && isOpen) && (
        <button
          onClick={() => {
            if (isUnavailable && !isOpen) return;
            if (!hasBeenOpened) {
              setHasBeenOpened(true);
              setMessages([{ role: "bot", content: "Hi — I'm Ben's portfolio assistant. Ask me anything about his experience, projects, or how to get in touch." }]);
            }
            setIsOpen(!isOpen);
          }}
          style={fabStyle}
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          {isOpen ? "✕" : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </button>
      )}

      {isOpen && (
        <div ref={panelRef} className="no-pinch-zoom" style={isMobile ? mobileWindow : desktopWindow}>
          {!isMobile && (
            <>
              <div onMouseDown={startResizing} style={{ position: "absolute", top: 0, left: 0, width: 20, height: 20, cursor: "nw-resize", zIndex: 1001 }} />
              <div onMouseDown={startResizing} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, cursor: "ns-resize", zIndex: 1001 }} />
              <div onMouseDown={startResizing} style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, cursor: "ew-resize", zIndex: 1001 }} />
            </>
          )}

          <div style={{
            padding: isMobile ? "0.875rem 1rem" : "0.875rem 1rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
            background: "linear-gradient(180deg, rgba(99,102,241,0.06), transparent)",
          }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600, color: "#fafafa", fontSize: "0.95rem" }}>Ask about Ben</span>
              <span style={{ fontSize: "0.72rem", color: "#888" }}>{isUnavailable ? "● Unavailable" : "● Online"}</span>
            </div>
            {isMobile && (
              <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#fafafa", fontSize: "1.4rem", cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
            )}
          </div>

          <div style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", minHeight: 0, touchAction: "pan-y", overscrollBehavior: "contain" }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? "#6366f1" : "#1a1a1d",
                color: m.role === "user" ? "#fff" : "#e8e8ea",
                padding: "0.65rem 0.9rem",
                borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                maxWidth: "85%",
                wordWrap: "break-word", whiteSpace: "pre-wrap",
                fontSize: "0.9rem", lineHeight: 1.5,
                border: m.role === "bot" ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                {m.content}
              </div>
            ))}
            {messages.length <= 1 && !isLoading && !isUnavailable && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    style={{
                      textAlign: "left",
                      background: "transparent",
                      color: "#a0a0a8",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "0.5rem 0.7rem",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {isLoading && <div style={{ alignSelf: "flex-start", color: "#888", fontSize: "0.85rem", fontStyle: "italic" }}>thinking…</div>}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={isUnavailable || isLoading}
                placeholder="Ask anything…"
                rows={1}
                style={{
                  flex: 1,
                  background: "#141417",
                  color: "#fafafa",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: "0.55rem 0.7rem",
                  resize: "none",
                  // Must be >= 16px: iOS Safari auto-zooms the viewport when
                  // focusing an input with a smaller font size.
                  fontSize: 16,
                  fontFamily: "inherit",
                  outline: "none",
                  maxHeight: 100,
                }}
              />
              <button
                onClick={() => send()}
                disabled={isLoading || !input.trim() || isUnavailable}
                style={{
                  background: input.trim() && !isLoading ? "linear-gradient(135deg, #6366f1, #ec4899)" : "#2a2a2e",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.55rem 0.9rem",
                  cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
