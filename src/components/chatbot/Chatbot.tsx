"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  RotateCcw,
  Bot,
  User,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  "🔥 What items are currently on sale?",
  "👕 Recommend casual t-shirts for everyday wear",
  "👖 Show me your jeans collection & fits",
  "🌿 What clothes are made of 100% Cotton?",
];

// Helper to render markdown-like content into React nodes safely
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-black/90">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal rule
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={idx} className="my-2 border-black/10" />;
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-black text-sm mt-2 mb-1 flex items-center gap-1.5">
              {parseInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-black text-base mt-2 mb-1">
              {parseInlineMarkdown(trimmed.replace(/^##\s+/, ""))}
            </h3>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-black/40 mt-1.5 h-1.5 w-1.5 rounded-full bg-black/60 shrink-0" />
              <div className="flex-1">
                {parseInlineMarkdown(trimmed.substring(2))}
              </div>
            </div>
          );
        }

        return <p key={idx}>{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

// Inline parser for **bold**, *italic*, and [Text](url)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Regex to match markdown links: [label](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        ...parseBoldItalic(text.substring(lastIndex, match.index), `${lastIndex}`)
      );
    }

    const label = match[1];
    const rawUrl = match[2];
    const isInternal = rawUrl.startsWith("/");

    parts.push(
      <Link
        key={`link-${match.index}`}
        href={rawUrl}
        className="inline-flex items-center gap-1 font-semibold text-black underline underline-offset-2 hover:text-black/70 bg-black/5 hover:bg-black/10 px-1.5 py-0.5 rounded transition-colors"
      >
        <span>{label}</span>
        <ExternalLink className="w-3 h-3 inline-block opacity-60" />
      </Link>
    );

    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(...parseBoldItalic(text.substring(lastIndex), `${lastIndex}`));
  }

  return parts;
}

function parseBoldItalic(text: string, keyPrefix: string): React.ReactNode[] {
  // First split by strikethrough (~~text~~)
  const strikeParts = text.split(/(~~[^~]+~~)/g);
  return strikeParts.map((strikePart, sIdx) => {
    if (strikePart.startsWith("~~") && strikePart.endsWith("~~")) {
      return (
        <span key={`${keyPrefix}-s-${sIdx}`} className="line-through text-black/50">
          {strikePart.slice(2, -2)}
        </span>
      );
    }

    // Split by bold (**text**)
    const boldParts = strikePart.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={`${keyPrefix}-${sIdx}-b-${i}`} className="font-semibold text-black">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  });
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi there! I'm your **Shop.co Stylist & AI Assistant**.\n\nI can help you find products, check current discounts, compare sizes & fabrics, and recommend the perfect outfit for any occasion!\n\nHow can I help you today?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    setLastFailedText(null);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Build messages payload for API (omit welcome greeting)
      const apiPayload = newMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiPayload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to reach AI assistant");
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (err: any) {
      setLastFailedText(textToSend);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ ${err.message || "Sorry, I encountered an error connecting to the service. Please try again in a moment."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "👋 Conversation reset! What would you like to explore in the Shop.co catalog?",
        timestamp: "Just now",
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[92vw] sm:w-[420px] h-[580px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-black/10 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-black text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-wide">ShopCo AI Stylist</h3>
                  <span className="bg-white/20 text-[10px] font-medium px-1.5 py-0.5 rounded text-white/90">
                    OpenAI
                  </span>
                </div>
                <p className="text-[11px] text-white/70 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Product Inventory Connected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Reset conversation"
                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    m.role === "user"
                      ? "bg-black text-white rounded-br-xs"
                      : "bg-white text-black border border-black/10 rounded-bl-xs"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <FormattedMessage content={m.content} />
                  ) : (
                    <p className="text-sm leading-relaxed">{m.content}</p>
                  )}
                  {m.role === "assistant" && m.content.startsWith("⚠️") && lastFailedText && (
                    <button
                      onClick={() => handleSend(lastFailedText)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold bg-black text-white px-2.5 py-1 rounded-full hover:bg-black/80 transition-all shadow-xs"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry question
                    </button>
                  )}
                  <span
                    className={`block text-[10px] mt-1.5 ${
                      m.role === "user" ? "text-white/60 text-right" : "text-black/40"
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-black/10 text-black flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Starter Suggestion Chips (shown after welcome message) */}
            {messages.length === 1 && (
              <div className="pt-2">
                <p className="text-xs text-black/50 font-medium mb-2 pl-1">
                  ✨ Quick questions to try:
                </p>
                <div className="flex flex-col gap-1.5">
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(prompt)}
                      className="text-left text-xs bg-white hover:bg-black hover:text-white text-black/80 border border-black/10 hover:border-black rounded-xl px-3 py-2 transition-all shadow-xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-black/10 rounded-2xl rounded-bl-xs px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-black/40 rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-black/40 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-black/40 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 bg-white border-t border-black/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about clothing, sizes, discounts..."
                disabled={isLoading}
                className="flex-1 bg-black/5 hover:bg-black/10 focus:bg-white border border-transparent focus:border-black/30 rounded-full px-4 py-2.5 text-sm outline-none transition-all placeholder:text-black/40"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-black hover:bg-black/80 disabled:opacity-30 disabled:hover:bg-black text-white flex items-center justify-center shrink-0 transition-all shadow-md active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-black/40">
              <span>Powered by OpenAI (GPT-4o Mini)</span>
              <span>Shop.co AI Assistant</span>
            </div>
          </div>
        </div>
      )}

      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Shopping Assistant Chat"
        className="group relative flex items-center gap-2.5 bg-black hover:bg-black/90 text-white px-4 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
      >
        <div className="relative">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-white" />
          ) : (
            <MessageCircle className="w-5 h-5 text-white" />
          )}
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </div>
        <span className="font-medium text-sm tracking-tight flex items-center gap-1.5">
          <span>AI Stylist</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
        </span>
      </button>
    </div>
  );
}
