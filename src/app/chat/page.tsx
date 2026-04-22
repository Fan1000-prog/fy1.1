"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/lib/i18n";
import { detectIntent } from "@/lib/intent";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type { Message, Source, VideoMeta, AttachedFile } from "@/types/message";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Globe,
  PlayCircle,
  ImageIcon,
  Mic,
  SendHorizonal,
  Plus,
  MessageSquare,
  Menu,
  Sparkles,
  StopCircle,
  ChevronDown,
  Paperclip,
  X,
  Download,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
}

const DEMO_CONVERSATIONS: Conversation[] = [
  { id: "1", title: "Actualités Madagascar", preview: "Les dernières nouvelles de…", time: "10:32" },
  { id: "2", title: "Résumé vidéo TED", preview: "J'ai analysé la vidéo sur…", time: "Hier" },
  { id: "3", title: "Image île tropicale", preview: "Voici l'image générée de…", time: "Hier" },
  { id: "4", title: "Traduction Malgache", preview: "La traduction du texte est…", time: "Lun" },
];

const DEMO_WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "",
  timestamp: new Date(),
};

const TOOL_STATUS_KEYS = {
  web: "chat_searching",
  youtube: "chat_analyzing_video",
  image: "chat_generating_image",
} as const;

const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const AI_TOOLS = [
  { id: "web", icon: Globe, labelKey: "chat_tool_web" as const },
  { id: "youtube", icon: PlayCircle, labelKey: "chat_tool_youtube" as const },
  { id: "image", icon: ImageIcon, labelKey: "chat_tool_image" as const },
  { id: "voice", icon: Mic, labelKey: "chat_tool_voice" as const },
];

export default function ChatPage() {
  const { t, locale } = useI18n();
  const [userName, setUserName] = useState("?");
  const [messages, setMessages] = useState<Message[]>([DEMO_WELCOME]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState("1");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<(AttachedFile & { base64: string }) | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const voice = useVoiceRecorder();

  useEffect(() => {
    const stored = localStorage.getItem("fy-user");
    if (stored) setUserName(stored);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (voice.state === "done" && voice.transcript) {
      setInput(voice.transcript);
      voice.reset();
      setActiveTool(null);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [voice.state, voice.transcript, voice]);

  useEffect(() => {
    if (voice.error === "mic_denied") {
      setFileError(t("chat_mic_denied"));
      voice.reset();
      setActiveTool(null);
    }
  }, [voice.error, voice, t]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setFileError(null);

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        setFileError(t("chat_file_invalid_type"));
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError(t("chat_file_too_large"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        setAttachedFile({ name: file.name, size: file.size, mimeType: file.type, base64 });
      };
      reader.readAsDataURL(file);
    },
    [t]
  );

  function handleToolPill(id: string) {
    if (id === "voice") {
      if (activeTool === "voice") {
        if (voice.state === "recording") voice.stop();
        else { voice.reset(); setActiveTool(null); }
      } else {
        setActiveTool("voice");
        voice.start();
      }
      return;
    }
    setActiveTool(activeTool === id ? null : id);
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && !attachedFile) || isTyping) return;

    const intent = activeTool && activeTool !== "voice"
      ? activeTool
      : text ? detectIntent(text) : "chat";

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      tool: intent !== "chat" ? intent : undefined,
      file: attachedFile
        ? { name: attachedFile.name, size: attachedFile.size, mimeType: attachedFile.mimeType }
        : undefined,
      timestamp: new Date(),
    };

    const filePayload = attachedFile
      ? { base64: attachedFile.base64, mimeType: attachedFile.mimeType }
      : null;

    setMessages((prev) => [...prev.filter((m) => m.id !== "welcome"), userMsg]);
    setInput("");
    setAttachedFile(null);
    setActiveTool(null);
    setFileError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsTyping(true);
    setActiveToolLabel(intent !== "chat" ? intent : null);

    try {
      const history = [...messages.filter((m) => m.id !== "welcome"), userMsg];
      const historyPayload = history.map((m) => ({ role: m.role, content: m.content }));
      let aiMsg: Message;

      if (intent === "web") {
        const res = await fetch("/api/tools/web", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, locale, history: historyPayload }),
        });
        const data = await res.json();
        aiMsg = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text || fallbackError(locale),
          tool: "web",
          sources: data.sources,
          error: !!data.error && !data.text,
          timestamp: new Date(),
        };
      } else if (intent === "youtube") {
        const res = await fetch("/api/tools/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, locale }),
        });
        const data = await res.json();
        aiMsg = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text || fallbackError(locale),
          tool: "youtube",
          video: data.video,
          error: !!data.error && !data.text,
          timestamp: new Date(),
        };
      } else if (intent === "image") {
        const res = await fetch("/api/tools/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, locale }),
        });
        const data = await res.json();
        aiMsg = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text || (data.imageBase64 ? "" : fallbackError(locale)),
          tool: "image",
          image: data.imageBase64
            ? { base64: data.imageBase64, mimeType: data.mimeType ?? "image/png" }
            : undefined,
          error: !!data.error && !data.imageBase64,
          timestamp: new Date(),
        };
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: historyPayload,
            locale,
            ...(filePayload ? { file: filePayload } : {}),
          }),
        });
        const data = await res.json();
        aiMsg = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text || fallbackError(locale),
          timestamp: new Date(),
        };
      }

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fallbackError(locale),
          error: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setActiveToolLabel(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isWelcome = messages.length === 1 && messages[0].id === "welcome";
  const isVoiceRecording = voice.state === "recording";
  const isVoiceTranscribing = voice.state === "transcribing";

  return (
    <div className="flex h-full bg-background">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <SidebarContent
          t={t}
          userName={userName}
          conversations={DEMO_CONVERSATIONS}
          activeConv={activeConv}
          setActiveConv={setActiveConv}
          onNewChat={() => { setMessages([DEMO_WELCOME]); setActiveConv(""); }}
        />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger>
                <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent md:hidden">
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent
                  t={t}
                  userName={userName}
                  conversations={DEMO_CONVERSATIONS}
                  activeConv={activeConv}
                  setActiveConv={setActiveConv}
                  onNewChat={() => setMessages([DEMO_WELCOME])}
                />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[10px] font-bold text-brand-foreground">
                fy
              </div>
              <span className="text-sm font-medium">fy</span>
            </div>
            <Badge variant="secondary" className="hidden gap-1 rounded-full text-xs sm:flex">
              <Sparkles className="h-3 w-3 text-brand" />
              Pro
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {isWelcome ? (
              <WelcomeScreen t={t} />
            ) : (
              <div className="space-y-6">
                {messages.filter((m) => m.id !== "welcome").map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    t={t}
                    userInitial={userName.charAt(0).toUpperCase()}
                  />
                ))}
                {isTyping && <TypingIndicator toolLabel={activeToolLabel} t={t} />}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-background p-4">
          <div className="mx-auto max-w-2xl">
            {/* Tool pills */}
            <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              {AI_TOOLS.map(({ id, icon: Icon, labelKey }) => {
                const isActive = activeTool === id;
                const isVoiceActive = id === "voice" && (isVoiceRecording || isVoiceTranscribing);
                return (
                  <button
                    key={id}
                    onClick={() => handleToolPill(id)}
                    disabled={isTyping}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      isVoiceRecording && id === "voice"
                        ? "animate-pulse border-red-400 bg-red-50 text-red-500"
                        : isActive || isVoiceActive
                        ? "border-brand/50 bg-brand-muted text-brand"
                        : "border-border bg-transparent text-muted-foreground hover:border-border/80 hover:text-foreground",
                      "disabled:opacity-40"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {isVoiceTranscribing && id === "voice"
                      ? t("chat_transcribing")
                      : isVoiceRecording && id === "voice"
                      ? "● REC"
                      : t(labelKey)}
                  </button>
                );
              })}
            </div>

            {/* Error / file feedback banner */}
            {fileError && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <X className="h-3 w-3 flex-shrink-0" />
                <span>{fileError}</span>
                <button onClick={() => setFileError(null)} className="ml-auto">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* File attachment preview */}
            {attachedFile && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                <Paperclip className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{attachedFile.name}</span>
                <span className="text-muted-foreground">
                  ({(attachedFile.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label={t("chat_remove_file")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Input box */}
            <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:border-brand/40 focus-within:shadow-md">
              <div className="flex items-end gap-2 p-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTyping}
                  aria-label={t("chat_attach_file")}
                  className="mb-0.5 flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={handleKeyDown}
                  placeholder={t("chat_placeholder")}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  style={{ maxHeight: "160px" }}
                />
                <Button
                  onClick={isTyping ? () => setIsTyping(false) : sendMessage}
                  size="icon"
                  disabled={!input.trim() && !attachedFile && !isTyping}
                  className={cn(
                    "mb-0.5 h-8 w-8 flex-shrink-0 rounded-xl transition-all",
                    input.trim() || attachedFile || isTyping
                      ? "bg-brand text-brand-foreground hover:bg-brand/90"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isTyping ? <StopCircle className="h-4 w-4" /> : <SendHorizonal className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
              fy peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fallbackError(locale: string): string {
  if (locale === "mg") return "Nisy olana. Andamo indray.";
  if (locale === "en") return "An error occurred. Please try again.";
  return "Une erreur est survenue. Veuillez réessayer.";
}

// ─── sidebar ──────────────────────────────────────────────────────────────────

function SidebarContent({
  t, userName, conversations, activeConv, setActiveConv, onNewChat,
}: {
  t: ReturnType<typeof useI18n>["t"];
  userName: string;
  conversations: Conversation[];
  activeConv: string;
  setActiveConv: (id: string) => void;
  onNewChat: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-brand-foreground">
            fy
          </div>
          <span className="text-sm font-semibold">fy</span>
        </div>
        <Button onClick={onNewChat} variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title={t("chat_new")}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      <div className="p-3">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl border-border text-sm font-normal text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("chat_new")}
        </Button>
      </div>
      <div className="px-3 pb-2">
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {t("chat_history")}
        </p>
      </div>
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-4">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              className={cn(
                "group flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition-all",
                activeConv === conv.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="truncate text-sm font-medium">{conv.title}</span>
                <span className="ml-2 flex-shrink-0 text-[10px] text-muted-foreground">{conv.time}</span>
              </div>
              <span className="mt-0.5 truncate text-xs text-muted-foreground">{conv.preview}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-3">
        <button className="flex w-full items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-sidebar-accent">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-sm font-medium text-brand">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">{userName}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ─── welcome ──────────────────────────────────────────────────────────────────

function WelcomeScreen({ t }: { t: ReturnType<typeof useI18n>["t"] }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-xl font-bold text-brand-foreground shadow-lg">
        fy
      </div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">{t("chat_welcome_title")}</h2>
      <p className="text-muted-foreground">{t("chat_welcome_sub")}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {[
          { icon: Globe, text: "Actualités Madagascar" },
          { icon: PlayCircle, text: "Résume cette vidéo" },
          { icon: ImageIcon, text: "Génère une image" },
          { icon: MessageSquare, text: "Explique-moi…" },
        ].map(({ icon: Icon, text }) => (
          <button
            key={text}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:bg-brand-muted hover:text-foreground hover:shadow-sm"
          >
            <Icon className="h-3.5 w-3.5" />
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, t, userInitial,
}: {
  msg: Message;
  t: ReturnType<typeof useI18n>["t"];
  userInitial: string;
}) {
  const isUser = msg.role === "user";

  const toolIcon: Record<string, React.ReactNode> = {
    web: <Globe className="h-2.5 w-2.5" />,
    youtube: <PlayCircle className="h-2.5 w-2.5" />,
    image: <ImageIcon className="h-2.5 w-2.5" />,
    voice: <Mic className="h-2.5 w-2.5" />,
  };

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-brand text-brand-foreground"
        )}
      >
        {isUser ? userInitial : "fy"}
      </div>

      <div className={cn("flex max-w-[80%] flex-col gap-1.5", isUser && "items-end")}>
        {/* Tool badge */}
        {msg.tool && (
          <Badge variant="secondary" className="w-fit gap-1 rounded-full text-[10px]">
            {toolIcon[msg.tool]}
            {msg.tool}
          </Badge>
        )}

        {/* File attachment (user messages) */}
        {msg.file && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
            <Paperclip className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{msg.file.name}</span>
            <span className="text-muted-foreground">({(msg.file.size / 1024).toFixed(0)} KB)</span>
          </div>
        )}

        {/* YouTube video card */}
        {msg.video && <VideoCard video={msg.video} />}

        {/* Generated image */}
        {msg.image && (
          <div className="flex flex-col gap-2">
            <img
              src={`data:${msg.image.mimeType};base64,${msg.image.base64}`}
              alt="Generated"
              className="max-w-[280px] rounded-xl border border-border object-cover shadow-sm"
            />
            <a
              href={`data:${msg.image.mimeType};base64,${msg.image.base64}`}
              download="fy-image.png"
              className="flex w-fit items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              {t("chat_download")}
            </a>
          </div>
        )}

        {/* Text bubble (skip for pure image responses with no caption) */}
        {msg.content && (
          <div
            className={cn(
              "px-4 py-3 text-sm leading-relaxed",
              isUser ? "chat-bubble-user" : "chat-bubble-ai",
              msg.error && "opacity-70"
            )}
          >
            {isUser ? (
              msg.content
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand underline underline-offset-2 hover:opacity-80"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{children}</pre>
                  ),
                  ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Source chips */}
        {msg.sources && msg.sources.length > 0 && (
          <SourceChips sources={msg.sources} label={t("chat_sources")} />
        )}

        <span className="text-[10px] text-muted-foreground/60">
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── video card ───────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: VideoMeta }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-brand/30 hover:bg-brand-muted"
    >
      {video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="h-14 w-24 flex-shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-14 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
          <PlayCircle className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{video.channel}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          {video.duration && <span>{video.duration}</span>}
          {video.viewCount && <span>· {video.viewCount} vues</span>}
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
    </a>
  );
}

// ─── source chips ─────────────────────────────────────────────────────────────

function SourceChips({ sources, label }: { sources: Source[]; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground">{label}:</span>
      {sources.map((src) => {
        let domain = src.uri;
        try { domain = new URL(src.uri).hostname.replace("www.", ""); } catch { /* invalid URL */ }
        return (
          <a
            key={src.uri}
            href={src.uri}
            target="_blank"
            rel="noopener noreferrer"
            title={src.title}
            className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-brand/30 hover:text-foreground"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            {domain}
          </a>
        );
      })}
    </div>
  );
}

// ─── typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({
  toolLabel, t,
}: {
  toolLabel: string | null;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const statusKey = toolLabel && toolLabel in TOOL_STATUS_KEYS
    ? TOOL_STATUS_KEYS[toolLabel as keyof typeof TOOL_STATUS_KEYS]
    : null;

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-brand-foreground">
        fy
      </div>
      <div className="chat-bubble-ai flex flex-col gap-1.5 px-4 py-3">
        {statusKey && (
          <span className="text-xs text-muted-foreground">{t(statusKey)}</span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
