// Chat.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Pin } from "lucide-react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { ChatMessage, ChatModeration, PinnedMessage } from "../types";

interface ChatTheme {
  containerBg?: string;
  headerBg?: string;
  bodyBg?: string;
  footerBg?: string;
  pinnedBg?: string;
  pinnedBorder?: string;
  avatarBg?: string;
  avatarBorder?: string;
  nameColor?: string;
  nameModeradorColor?: string;
  messageColor?: string;
  inputPillBg?: string;
  inputPlaceholder?: string;
  inputText?: string;
  sendBtnBg?: string;
  sendBtnBorder?: string;
  sendIcon?: string;
  showBorders?: boolean;
  borderColor?: string;
  borderRadiusPx?: number;
}

interface ChatProps {
  videoId: string;
  isMobile?: boolean;
  theme?: ChatTheme;
}

const DEFAULT_THEME: Required<Omit<ChatTheme, "borderRadiusPx">> & {
  borderRadiusPx: number;
} = {
  containerBg: "#1a1a1a",
  headerBg: "#202020",
  bodyBg: "#1a1a1a",
  footerBg: "#303030",
  pinnedBg: "#131313",
  pinnedBorder: "#2b2b2b",
  avatarBg: "#2a2a2a",
  avatarBorder: "#3a3a3a",
  nameColor: "#9ca3af",
  nameModeradorColor: "#FFE100",
  messageColor: "#ffffff",
  inputPillBg: "#ffffff",
  inputPlaceholder: "#6b7280",
  inputText: "#0f0f0f",
  sendBtnBg: "#ffffff",
  sendBtnBorder: "#d9d9d9",
  sendIcon: "#000000",
  showBorders: false,
  borderColor: "#2b2b2b",
  borderRadiusPx: 16,
};

const AVATAR_PALETTE = [
  "#40BAC4",
  "#A78BFA",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#3B82F6",
  "#F472B6",
  "#22D3EE",
  "#84CC16",
  "#FB923C",
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickAvatarColor(name: string): string {
  if (!name) return AVATAR_PALETTE[0];
  const idx = hashString(name.trim().toLowerCase()) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}

function getInitial(name: string): string {
  const n = (name || "").trim();
  return n ? n[0].toUpperCase() : "?";
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

interface ChatBodyProps {
  messages: ChatMessage[];
  pinnedMessage: PinnedMessage | null;
  isMuted: boolean;
  muteMessage: string;
  newMessage: string;
  onChangeMessage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmitMessage: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  theme: typeof DEFAULT_THEME;
}

const ChatBody: React.FC<ChatBodyProps> = React.memo(
  ({
    messages,
    pinnedMessage,
    isMuted,
    muteMessage,
    newMessage,
    onChangeMessage,
    onSubmitMessage,
    inputRef,
    messagesEndRef,
    theme,
  }) => {
    return (
      <>
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ backgroundColor: theme.bodyBg }}
        >
          {pinnedMessage && (
            <div
              className="sticky top-0 z-10 mb-2 p-3 rounded-xl"
              style={{
                backgroundColor: theme.pinnedBg,
                border: `1px solid ${theme.pinnedBorder}`,
              }}
            >
              <div className="flex items-start gap-2">
                <Pin
                  size={16}
                  className="mt-0.5 shrink-0"
                  color={theme.nameColor}
                />
                <div className="min-w-0">
                  <span
                    className="text-[11px] block mb-1"
                    style={{ color: theme.nameColor }}
                  >
                    Moderador
                  </span>
                  {pinnedMessage.link ? (
                    <>
                      <p
                        className="text-sm leading-snug break-words"
                        style={{ color: theme.messageColor }}
                      >
                        {pinnedMessage.message}
                      </p>
                      <a
                        href={pinnedMessage.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm leading-snug break-words hover:underline"
                        style={{ color: theme.nameModeradorColor }}
                      >
                        {pinnedMessage.link}
                      </a>
                    </>
                  ) : (
                    <p
                      className="text-sm leading-snug break-words"
                      style={{ color: theme.messageColor }}
                    >
                      {pinnedMessage.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 && (
            <div
              className="text-center py-10"
              style={{ color: theme.nameColor }}
            >
              Se el primero en comentar
            </div>
          )}

          {messages.map((m) => {
            if (m.isModerator) {
              return (
                <div
                  key={m.id}
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: theme.pinnedBg,
                    border: `1px solid ${theme.pinnedBorder}`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <span
                        className="text-[11px] block mb-1"
                        style={{ color: theme.nameModeradorColor }}
                      >
                        Moderador
                      </span>
                      {m.link ? (
                        <>
                          <p
                            className="text-sm leading-snug break-words"
                            style={{ color: theme.messageColor }}
                          >
                            {m.message}
                          </p>
                          <a
                            href={m.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm leading-snug break-words hover:underline"
                            style={{ color: theme.nameModeradorColor }}
                          >
                            {m.link}
                          </a>
                        </>
                      ) : (
                        <p
                          className="text-sm leading-snug break-words"
                          style={{ color: theme.messageColor }}
                        >
                          {m.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const bg = pickAvatarColor(m.username || "");
            const initial = getInitial(m.username || "");
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: bg,
                    border: "none",
                  }}
                  aria-hidden
                >
                  <span
                    className="text-[12px] font-bold leading-none select-none"
                    style={{ color: "#FFFFFF" }}
                  >
                    {initial}
                  </span>
                </div>

                <div className="min-w-0">
                  <div
                    className="text-[10px] leading-none mb-1"
                    style={{ color: theme.nameColor }}
                  >
                    {m.username}
                  </div>
                  <div
                    className="text-sm font-semibold leading-snug break-words"
                    style={{ color: theme.messageColor }}
                  >
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={onSubmitMessage}
          className="px-3 py-8"
          style={{
            backgroundColor: theme.footerBg,
            borderTop: theme.showBorders
              ? `1px solid ${theme.borderColor}`
              : "none",
          }}
        >
          {isMuted && (
            <div
              className="mb-2 text-xs text-center"
              style={{ color: "#f87171" }}
            >
              {muteMessage}
            </div>
          )}

          <div className="w-full">
            <div
              className="w-full flex items-center rounded-full shadow-sm px-4 py-2"
              style={{
                backgroundColor: theme.inputPillBg,
                border: `1px solid ${theme.sendBtnBorder}`,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={onChangeMessage}
                placeholder={
                  isMuted ? "No puedes enviar mensajes" : "Escriba su mensaje"
                }
                className="flex-1 bg-transparent text-[15px] focus:outline-none"
                style={{ color: theme.inputText, caretColor: theme.inputText }}
                maxLength={500}
                disabled={isMuted}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isMuted}
                aria-label="Enviar"
                title="Enviar"
                className="ml-2 inline-flex items-center justify-center w-10 h-10 rounded-full active:scale-[0.98] transition disabled:opacity-50"
                style={{
                  backgroundColor: theme.sendBtnBg,
                  border: `1px solid ${theme.sendBtnBorder}`,
                }}
              >
                <Send size={18} color={theme.sendIcon} />
              </button>
            </div>
          </div>
        </form>
      </>
    );
  }
);
ChatBody.displayName = "ChatBody";

const Chat: React.FC<ChatProps> = ({
  videoId,
  isMobile = false,
  theme = {},
}) => {
  const THEME = { ...DEFAULT_THEME, ...theme };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [showUsernameForm, setShowUsernameForm] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [muteMessage, setMuteMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "chatMessages"),
      where("videoId", "==", videoId),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data() as any).timestamp?.toDate(),
      })) as ChatMessage[];
      setMessages(messagesData);
    });
    return unsubscribe;
  }, [videoId]);

  useEffect(() => {
    const q = query(
      collection(db, "pinnedMessages"),
      where("videoId", "==", videoId),
      where("isActive", "==", true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setPinnedMessage(null);
        return;
      }
      const pinnedData = snapshot.docs[0];
      const data = pinnedData.data() as any;
      setPinnedMessage({
        id: pinnedData.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? null,
        updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? null,
      } as PinnedMessage);
    });
    return unsubscribe;
  }, [videoId]);

  useEffect(() => {
    const savedUsername = localStorage.getItem("chatUsername");
    const savedEmail = localStorage.getItem("chatEmail");

    if (savedUsername && savedEmail) {
      setUsername(savedUsername);
      setEmail(savedEmail);
      setShowUsernameForm(false);
      checkMuteStatus(savedUsername);
    } else {
      if (savedUsername) setUsername(savedUsername);
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (username) {
      const interval = setInterval(() => {
        checkMuteStatus(username);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [username, videoId]);

  const checkMuteStatus = async (usernameToCheck: string) => {
    try {
      const q = query(
        collection(db, "chatModeration"),
        where("videoId", "==", videoId),
        where("username", "==", usernameToCheck)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setIsMuted(false);
        setMuteMessage("");
        return;
      }

      const moderation = snapshot.docs[0].data() as ChatModeration;

      if (moderation.permanentlyMuted) {
        setIsMuted(true);
        setMuteMessage("Você foi silenciado permanentemente neste vídeo");
        return;
      }

      if (moderation.mutedUntil) {
        const mutedUntil =
          moderation.mutedUntil instanceof Date
            ? moderation.mutedUntil
            : (moderation.mutedUntil as any).toDate?.() ??
              new Date(moderation.mutedUntil as any);

        if (mutedUntil > new Date()) {
          setIsMuted(true);
          const minutes = Math.ceil(
            (mutedUntil.getTime() - Date.now()) / 60000
          );
          setMuteMessage(`Você está silenciado por mais ${minutes} minuto(s)`);
        } else {
          setIsMuted(false);
          setMuteMessage("");
        }
      } else {
        setIsMuted(false);
        setMuteMessage("");
      }
    } catch (error) {
      console.error("Erro ao verificar status de mute:", error);
    }
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      alert("Por favor, insira seu nome.");
      return;
    }

    if (!email.trim() || !isValidEmail(email.trim())) {
      alert("Por favor, insira um e-mail válido.");
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    localStorage.setItem("chatUsername", trimmedUsername);
    localStorage.setItem("chatEmail", trimmedEmail);

    setShowUsernameForm(false);
    checkMuteStatus(trimmedUsername);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isMuted) return;

    const messageToSend = newMessage.trim();
    setNewMessage("");

    try {
      await addDoc(collection(db, "chatMessages"), {
        videoId,
        username,
        email,
        message: messageToSend,
        isModerator: false,
        timestamp: new Date(),
      });
      inputRef.current?.focus();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setNewMessage(messageToSend);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
    },
    []
  );

  if (showUsernameForm) {
    return (
      <div
        className="shadow-2xl p-6 flex items-center justify-center"
        style={{
          height: isMobile ? "60vh" : "60vh",
          backgroundColor: THEME.containerBg,
          border: THEME.showBorders ? `1px solid ${THEME.borderColor}` : "none",
          borderRadius: THEME.borderRadiusPx,
          overflow: "hidden",
        }}
      >
        <div className="text-center w-full max-w-sm">
          <MessageCircle className="mx-auto h-12 w-12 mb-4" color="#00DBD9" />
          <h3
            className="text-xl font-semibold mb-4"
            style={{ color: THEME.messageColor }}
          >
            Chat en vivo
          </h3>
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu nombre"
              className="w-full px-4 py-3 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
              style={{
                backgroundColor: "#0f0f0f",
                color: "#ffffff",
                border: `1px solid ${THEME.borderColor}`,
              }}
              maxLength={20}
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ingresa tu correo electrónico"
              className="w-full px-4 py-3 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
              style={{
                backgroundColor: "#0f0f0f",
                color: "#ffffff",
                border: `1px solid ${THEME.borderColor}`,
              }}
              required
            />
            <button
              type="submit"
              className="w-full text-black font-medium py-3 px-4 rounded-lg transition"
              style={{ backgroundColor: "#00DBD9" }}
            >
              Unirse al chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  const containerHeight = isMobile ? "min(50vh, 620px)" : "min(82vh, 900px)";

  return (
    <div
      className="shadow-2xl flex flex-col"
      style={{
        height: containerHeight,
        backgroundColor: THEME.containerBg,
        border: THEME.showBorders ? `1px solid ${THEME.borderColor}` : "none",
        borderRadius: THEME.borderRadiusPx,
        overflow: "hidden",
      }}
    >
      <div
        className={isMobile ? "p-3" : "p-4"}
        style={{
          backgroundColor: THEME.headerBg,
          borderBottom: THEME.showBorders
            ? `1px solid ${THEME.borderColor}`
            : "none",
        }}
      >
        <div className="flex items-center justify-between">
          <h3
            className={
              isMobile ? "text-base font-semibold" : "text-lg font-semibold"
            }
            style={{ color: THEME.messageColor }}
          >
            Chat en vivo
          </h3>
          <button
            className="hover:opacity-80"
            aria-label="Menu"
            style={{ color: THEME.nameColor }}
          >
            <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
              <circle cx="2" cy="2" r="2" />
              <circle cx="2" cy="8" r="2" />
              <circle cx="2" cy="14" r="2" />
            </svg>
          </button>
        </div>
      </div>

      <ChatBody
        messages={messages}
        pinnedMessage={pinnedMessage}
        isMuted={isMuted}
        muteMessage={muteMessage}
        newMessage={newMessage}
        onChangeMessage={handleInputChange}
        onSubmitMessage={handleMessageSubmit}
        inputRef={inputRef}
        messagesEndRef={messagesEndRef}
        theme={THEME}
      />
    </div>
  );
};

export default Chat;
