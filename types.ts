export interface TikTokContent {
  title: string;
  visual_suggestions: string;
  script_0_3s: string;
  script_3_15s: string;
  script_15_45s: string;
  script_ending: string;
}

export interface RedNoteContent {
  title: string;
  content: string;
  tags: string[];
}

export interface TwitterContent {
  hook: string;
  points: string[];
  summary: string;
}

export interface AIPromptContent {
  image_prompt: string;
}

export interface GeneratedContent {
  tiktok: TikTokContent;
  rednote: RedNoteContent;
  twitter: TwitterContent;
  ai_video: AIPromptContent;
}

export type Platform = 'tiktok' | 'rednote' | 'twitter' | 'ai_video';