import { db } from "./client";
import {
  collection,
  doc,
  addDoc,
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messages: ChatMessage[];
}

export async function createChat(userId: string, title: string): Promise<string> {
  const chatRef = await addDoc(collection(db, "users", userId, "chats"), {
    userId,
    title,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    messages: [],
  });
  return chatRef.id;
}

export async function saveMessage(
  userId: string,
  chatId: string,
  message: ChatMessage
): Promise<void> {
  const chatRef = doc(db, "users", userId, "chats", chatId);
  await updateDoc(chatRef, {
    messages: [...(await getChatMessages(userId, chatId)), message],
    updatedAt: Timestamp.now(),
  });
}

export async function getChatMessages(
  userId: string,
  chatId: string
): Promise<ChatMessage[]> {
  const chatRef = doc(db, "users", userId, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    const data = chatSnap.data() as DocumentData;
    return (data.messages as ChatMessage[]) || [];
  }

  return [];
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const chatsRef = collection(db, "users", userId, "chats");
  const q = query(chatsRef, orderBy("updatedAt", "desc"), limit(50));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Chat[];
}

export async function getChat(userId: string, chatId: string): Promise<Chat | null> {
  const chatRef = doc(db, "users", userId, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    return { id: chatSnap.id, ...chatSnap.data() } as Chat;
  }

  return null;
}

export async function deleteChat(userId: string, chatId: string): Promise<void> {
  const chatRef = doc(db, "users", userId, "chats", chatId);
  await deleteDoc(chatRef);
}

export async function updateChatTitle(
  userId: string,
  chatId: string,
  title: string
): Promise<void> {
  const chatRef = doc(db, "users", userId, "chats", chatId);
  await updateDoc(chatRef, { title, updatedAt: Timestamp.now() });
}
