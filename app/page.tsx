"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Mic, Plus, Square } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComposerView = "chat" | "compact" | "voice";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
}

// ─── Placeholder responses ────────────────────────────────────────────────────

const PLACEHOLDER_RESPONSES = [
  `## Getting Started\n\nWelcome to the demo. This interface doesn't have a backend connected yet, but it's designed to feel like one.\n\n### What You Can Do\n\nEven without an AI model, you can explore the full UI:\n\n- Type messages and see them appear as chat bubbles\n- Watch the streaming animation simulate a response\n- Toggle between compact and expanded composer views\n- Hover over the composer to see the 3D tilt effect`,

  `## Connecting a Backend\n\nTo make this a real chat app, you'll need an API route that talks to an LLM provider.\n\n### Steps to Integrate\n\nThe process is straightforward once you pick a model:\n\n- Create an API route at \`/app/api/chat/route.ts\`\n- Install the SDK for your preferred provider\n- Stream tokens back using a ReadableStream\n- Replace the placeholder response logic with real completions`,

  `## Design Philosophy\n\nThis interface was built with minimalism in mind. No sidebars, no clutter — just a conversation.\n\n### Key Decisions\n\nEvery detail serves a purpose:\n\n- Dark mode by default to reduce eye strain\n- SF Pro font for a native Apple feel\n- Fixed composer pinned 40px from the bottom\n- Smooth morphing animation between compact and expanded states`,

  `## Architecture Overview\n\nThe app is structured around a single Composer component that manages all state.\n\n### Component Breakdown\n\nHere's how the pieces fit together:\n\n- \`Composer\` — root component, owns messages and view state\n- \`ComposerBar\` — the input UI, morphs between compact and chat modes\n- \`MessageBubble\` — renders individual user and assistant messages\n- All animations use CSS transitions, no animation libraries needed`,

  `## What's Next\n\nThere are several directions you could take this project from here.\n\n### Ideas to Explore\n\nSome features that would complement the current design:\n\n- Markdown rendering for assistant responses\n- Code syntax highlighting in message bubbles\n- Conversation persistence with localStorage or a database\n- Keyboard shortcuts for power users\n- Voice input via the Web Speech API`,
];

let responseIndex = 0;
function getNextResponse() {
  const res = PLACEHOLDER_RESPONSES[responseIndex % PLACEHOLDER_RESPONSES.length];
  responseIndex++;
  return res;
}

// ─── Composer ─────────────────────────────────────────────────────────────────

export default function Composer() {
  const [view, setView] = useState<ComposerView>("compact");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopStreaming = useCallback(() => {
    if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const fullResponse = getNextResponse();
    let charIndex = 0;

    const typeNext = () => {
      if (charIndex >= fullResponse.length) { setIsStreaming(false); return; }
      charIndex++;
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsg.id ? { ...m, content: fullResponse.slice(0, charIndex) } : m)
      );
      streamTimerRef.current = setTimeout(typeNext, 5);
    };
    streamTimerRef.current = setTimeout(typeNext, 100);
  }, [isStreaming]);

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Background — always visible */}
      <div className="pb-[140px]">
        {isEmpty ? (
          <div className="flex items-center justify-center" style={{ height: "calc(100vh - 140px)" }}>
            <h1 className="text-2xl font-semibold text-foreground/80">What can I help with?</h1>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
            {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
          </div>
        )}
      </div>

      {/* Composer — fixed, morphs between views */}
      <ComposerBar
        view={view}
        isStreaming={isStreaming}
        onSend={sendMessage}
        onStop={stopStreaming}
        onExpand={() => setView("chat")}
        onCollapse={() => setView("compact")}
        onVoice={() => setView("voice")}
      />
    </>
  );
}

// ─── Composer bar ─────────────────────────────────────────────────────────────

function ComposerBar({ view, isStreaming, onSend, onStop, onExpand, onCollapse, onVoice }: {
  view: ComposerView;
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onVoice: () => void;
}) {
  const [input, setInput] = useState("");
  const [tilt, setTilt] = useState({ x: 0, y: 0, shine: { x: 50, y: 50 } });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isChat = view === "chat";
  const isVoice = view === "voice";
  const isExpanded = isChat || isVoice;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const intensity = isExpanded ? 3 : 8;
    setTilt({
      x: (y - 0.5) * -intensity,
      y: (x - 0.5) * intensity,
      shine: { x: x * 100, y: y * 100 },
    });
  }, [isExpanded]);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0, shine: { x: 50, y: 50 } });
  }, []);

  // Focus textarea when expanding to chat
  useEffect(() => {
    if (isChat) setTimeout(() => textareaRef.current?.focus(), 300);
  }, [isChat]);

  // Collapse on outside click when expanded
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        onCollapse();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isExpanded, onCollapse]);

  const handleSend = useCallback(() => {
    onSend(input);
    setInput("");
  }, [input, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <>
    {/* Bottom fade gradient */}
    <div className="fixed bottom-0 left-0 right-0 h-[140px] pointer-events-none"
      style={{ background: "linear-gradient(to top, var(--background) 0%, var(--background) 20%, transparent 100%)", opacity: 0.8 }}
    />
    <div className="fixed bottom-[24px] left-0 right-0 flex justify-center px-4">
      <div
        ref={composerRef}
        className="w-full transition-all duration-300 ease-in-out"
        style={{ maxWidth: isExpanded ? "42rem" : "20rem", perspective: "800px" }}
        onClick={!isExpanded ? onExpand : undefined}
      >
        <div
          ref={cardRef}
          className="relative border border-border bg-background shadow-sm overflow-hidden"
          style={{
            padding: isExpanded ? "16px" : "10px",
            borderRadius: isExpanded ? "1.5rem" : "2.25rem",
            cursor: isExpanded ? "default" : "pointer",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 150ms ease-out, border-radius 300ms ease-in-out, padding 300ms ease-in-out",
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Shine overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: "inherit",
              background: `radial-gradient(circle at ${tilt.shine.x}% ${tilt.shine.y}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
              opacity: tilt.x === 0 && tilt.y === 0 ? 0 : 1,
              transition: "opacity 300ms ease-out",
            }}
          />
          {/* Textarea — animates in/out via grid rows */}
          <div
            className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
            style={{
              gridTemplateRows: isChat ? "1fr" : "0fr",
              opacity: isChat ? 1 : 0,
            }}
          >
            <div className="overflow-hidden">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="I want to..."
                rows={1}
                style={{ fontSize: "22px" }}
                className="min-h-0 max-h-48 resize-none border-0 bg-transparent p-0 leading-snug shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
              <div className="h-3" />
            </div>
          </div>

          {/* Voice — animates in/out via grid rows */}
          <div
            className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
            style={{
              gridTemplateRows: isVoice ? "1fr" : "0fr",
              opacity: isVoice ? 1 : 0,
            }}
          >
            <div className="overflow-hidden">
              {/* Placeholder text */}
              <p className="text-muted-foreground/50" style={{ fontSize: "22px" }}>I want to...</p>
              <div className="h-3" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {isVoice ? (
              <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground"
                onClick={(e) => { e.stopPropagation(); onCollapse(); }}>
                <Square className="size-4 fill-current" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                onClick={(e) => e.stopPropagation()}>
                <Plus className="size-6" />
              </Button>
            )}

            {/* Center — compact label or voice waveform */}
            {isVoice ? (
              <div className="flex-1 flex items-center gap-1 h-10 px-1">
                <Waveform />
              </div>
            ) : (
              <span
                className="flex-1 text-center text-muted-foreground/50 select-none transition-opacity duration-300 ease-in-out"
                style={{ fontSize: "20px", opacity: isExpanded ? 0 : 1, pointerEvents: isExpanded ? "none" : "auto" }}
              >I want to...</span>
            )}

            {/* Right buttons */}
            <div
              className="relative flex items-center gap-2 shrink-0 transition-all duration-150 ease-out"
              style={{ paddingRight: isChat && !isStreaming && input.trim() ? "48px" : "0px" }}
            >
              {isVoice && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  <VoiceTimer />
                </span>
              )}
              {isStreaming ? (
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground"
                  onClick={(e) => { e.stopPropagation(); onStop(); }}>
                  <Square className="size-4 fill-current" />
                </Button>
              ) : isVoice ? (
                <Button size="icon" className="h-10 w-10 rounded-full"
                  onClick={(e) => { e.stopPropagation(); onCollapse(); }}>
                  <ArrowUp className="size-6" />
                </Button>
              ) : (
                <>
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                    onClick={(e) => { e.stopPropagation(); isChat ? onVoice() : onExpand(); }}>
                    <Mic className="size-6" />
                  </Button>
                  {isChat && (
                    <Button
                      size="icon"
                      className="absolute right-0 h-10 w-10 rounded-full transition-transform duration-150 ease-out"
                      style={{ transform: input.trim() ? "scale(1)" : "scale(0)", pointerEvents: input.trim() ? "auto" : "none" }}
                      onClick={handleSend}
                    >
                      <ArrowUp className="size-6" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

function Waveform() {
  const barCount = 48;
  return (
    <div className="flex items-center gap-[2px] w-full h-8">
      {Array.from({ length: barCount }).map((_, i) => {
        const baseHeight = Math.random() * 0.6 + 0.1;
        return (
          <div
            key={i}
            className="flex-1 rounded-full bg-foreground/70"
            style={{
              height: `${baseHeight * 100}%`,
              animation: `waveform 1.2s ease-in-out ${i * 0.05}s infinite alternate`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes waveform {
          0% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
          100% { transform: scaleY(0.3); }
        }
      `}</style>
    </div>
  );
}

// ─── Voice timer ──────────────────────────────────────────────────────────────

function VoiceTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return <>{mins}:{secs.toString().padStart(2, "0")}</>;
}

// ─── Simple markdown ──────────────────────────────────────────────────────────

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc pl-5 space-y-1 my-2">
          {listItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushList();
      elements.push(<h2 key={key++} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flushList();
      elements.push(<h3 key={key++} className="text-base font-medium mt-3 mb-1.5">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      elements.push(<p key={key++} className="my-1.5">{line}</p>);
    }
  }
  flushList();

  return <div>{elements}</div>;
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] text-sm text-foreground leading-relaxed">
        {message.content ? <SimpleMarkdown content={message.content} /> : <span className="inline-block h-4 w-1 animate-pulse bg-foreground/60 rounded-sm" />}
      </div>
    </div>
  );
}
