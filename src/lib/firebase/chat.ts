import { db } from "./client";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
} from "firebase/firestore";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool?: string;
  timestamp: number;
  sources?: Array<{ uri: string; title: string }>;
  image?: { base64: string; mimeType: string };
  video?: {
    videoId: string;
    title: string;
    channel: string;
    thumbnailUrl?: string;
    duration?: string;
    viewCount?: string;
  };
  file?: { name: string; size: number; mimeType: string };
  error?: boolean;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  preview?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Legacy inline storage. New chats keep messages in a subcollection. */
  messages?: ChatMessage[];
}

const MESSAGES_LIMIT = 200;

/**
 * Firestore caps a document at 1 MiB. Generated images are base64 and routinely
 * 200KB-1MB each, so persisting them inside the message would eventually make
 * the whole conversation unsaveable — and the failure was being swallowed by a
 * .catch(console.error), silently losing the user's history.
 *
 * The image is already rendered in the live session; dropping the bytes from
 * the persisted copy costs a re-generation on reload and keeps the chat alive.
 */
function stripHeavyFields(message: ChatMessage): ChatMessage {
  if (!message.image) return message;
  const rest = { ...message };
  delete rest.image;
  return { ...rest, tool: rest.tool ?? "image" };
}

export async function createChat(userId: string, title: string): Promise<string> {
  const chatRef = await addDoc(collection(db, "users", userId, "chats"), {
    userId,
    title,
    preview: "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return chatRef.id;
}

/**
 * Messages live in a subcollection, one document each.
 *
 * The previous design appended to an array field on the chat document, which
 * meant every save rewrote the entire conversation and every sidebar read
 * downloaded it.
 */
export async function saveMessage(
  userId: string,
  chatId: string,
  message: ChatMessage
): Promise<void> {
  const safe = stripHeavyFields(message);
  await setDoc(doc(db, "users", userId, "chats", chatId, "messages", safe.id), safe);
  await updateDoc(doc(db, "users", userId, "chats", chatId), {
    updatedAt: Timestamp.now(),
    preview: safe.content.slice(0, 60),
  });
}

export async function getChatMessages(
  userId: string,
  chatId: string
): Promise<ChatMessage[]> {
  const messagesRef = collection(db, "users", userId, "chats", chatId, "messages");
  const snapshot = await getDocs(
    query(messagesRef, orderBy("timestamp", "asc"), limit(MESSAGES_LIMIT))
  );

  if (!snapshot.empty) return snapshot.docs.map((d) => d.data() as ChatMessage);

  // Fall back to the legacy inline array so chats written before the migration
  // still open.
  const chatSnap = await getDoc(doc(db, "users", userId, "chats", chatId));
  if (!chatSnap.exists()) return [];
  const data = chatSnap.data() as DocumentData;
  return (data.messages as ChatMessage[]) ?? [];
}

/**
 * Sidebar listing. Selects only the fields the sidebar renders — it must never
 * pull message bodies, or read cost scales with total history written rather
 * than with what is displayed.
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
  const chatsRef = collection(db, "users", userId, "chats");
  const snapshot = await getDocs(query(chatsRef, orderBy("updatedAt", "desc"), limit(50)));

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      title: data.title,
      // Legacy docs have no preview field; derive it from the trailing message.
      preview: data.preview ?? data.messages?.at(-1)?.content?.slice(0, 60) ?? "",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Chat;
  });
}

export async function deleteChat(userId: string, chatId: string): Promise<void> {
  const messagesRef = collection(db, "users", userId, "chats", chatId, "messages");
  const snapshot = await getDocs(messagesRef);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "users", userId, "chats", chatId));
}

export async function updateChatTitle(
  userId: string,
  chatId: string,
  title: string
): Promise<void> {
  await updateDoc(doc(db, "users", userId, "chats", chatId), {
    title,
    updatedAt: Timestamp.now(),
  });
}
