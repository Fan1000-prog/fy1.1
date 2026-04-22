export interface Source {
  uri: string;
  title: string;
}

export interface VideoMeta {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnailUrl: string;
  viewCount?: string;
}

export interface AttachedFile {
  name: string;
  size: number;
  mimeType: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool?: string;
  timestamp: Date;
  sources?: Source[];
  image?: { base64: string; mimeType: string };
  video?: VideoMeta;
  file?: AttachedFile;
  error?: boolean;
}
