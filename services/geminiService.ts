import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedContent } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const BASE_SYSTEM_INSTRUCTION = `
You are a top-tier social media content expert with 10 years of experience, mastering viral traffic logic. 
Your task is to generate customized, high-quality content for four different platforms based on a user-provided [Theme].

The output MUST be in JSON format.
Language: Chinese (Simplified) for ALL sections.

Strategies per platform:
1. **TikTok/Douyin/Video Channels (Short Video)**:
   - Logic: Golden 3-second rule, emotional engagement, fast-paced.
   - Structure: [Explosive Opening] + [Pain Point/Twist] + [Core Value/Solution] + [Engagement Call].
   - Tone: Grounded, confident, slightly exaggerated.

2. **RedNote (XiaoHongShu) (Lifestyle/Review)**:
   - Logic: Exquisite feel, pragmatism, emotional value.
   - Structure: [Attractive Title] + [Body (with Emojis)] + [God-tier Tags].
   - Tone: "Bestie" vibe, sharing desire, gentle or intellectual female perspective.
   - Requirement: Must use many Emojis (🌟, 👇, 💡, etc.).

3. **Twitter (X)**:
   - Logic: Sharp viewpoints, high information density, Thread format.
   - Structure: [Strong Hook] + [Bullet Points] + [Summary].
   - Tone: Professional, cool, objective, or controversial.

4. **AI Video Prompt (For Runway/Sora/Kling)**:
   - Task: Generate a detailed video description prompt.
   - Language: Chinese (Simplified). (User prefers Chinese prompts for domestic AI tools).
   - Format: Detailed description including lighting, camera angle, mood, subject, visual style.
`;

export interface TrendItem {
  category: string;
  title: string;
  heat: string;
  tags: string[];
  content: string;
  isFallback?: boolean; // 标记是否为兜底数据
}

// 兜底数据池：当网络不可用时展示这些常青爆款
const FALLBACK_TRENDS: TrendItem[] = [
  {
    category: '搞钱思维',
    title: '普通人翻身路子',
    heat: '精选爆款',
    tags: ['副业', '思维', '认知'],
    content: "普通人最大的误区就是觉得赚钱要靠出卖时间。错！大错特错！❌ 真正的富人都在做“睡后收入”。今天揭秘这 3 个低成本高回报的搞钱路子，特别是第 2 个，哪怕你是大学生也能做！",
    isFallback: true
  },
  {
    category: '极简生活',
    title: '断舍离清单',
    heat: '精选爆款',
    tags: ['生活', '自律', '极简'],
    content: "2024年，我扔掉了家里这50样东西，感觉整个人都轻盈了！🏠 1. 两年没穿过的衣服；2. 过期的化妆品... 真的，生活越简单，内心越富足。低欲望生活，才是最高级的自律。",
    isFallback: true
  },
  {
    category: '职场干货',
    title: '拒绝精神内耗',
    heat: '精选爆款',
    tags: ['职场', '心态', '成长'],
    content: "建议所有打工人都把这句话刻在烟吸肺！在这里工作是为了赚钱，不是为了来交朋友的。在这个草台班子世界里，只要你不尴尬，尴尬的就是别人。准点下班，拒绝内耗！",
    isFallback: true
  },
  {
    category: '旅行攻略',
    title: '被低估的神仙小城',
    heat: '精选爆款',
    tags: ['旅行', '小众', '攻略'],
    content: "真的不是国外！！这里是国内！🇨🇳 没想到国内竟然藏着这么一个神仙地方，物价低到感人，风景美到窒息。没有成群结队的游客，只有最纯粹的烟火气。",
    isFallback: true
  },
  {
    category: '情感治愈',
    title: '致当下的你',
    heat: '精选爆款',
    tags: ['情感', '治愈', '深夜'],
    content: "也许你现在正经历着人生最至暗的时刻，觉得很累，很迷茫。但请相信，万物皆有裂痕，那是光照进来的地方。不要焦虑，不要慌张，你想要的，岁月都会给你。",
    isFallback: true
  },
  {
    category: 'AI工具',
    title: 'AI 效率神器',
    heat: '精选爆款',
    tags: ['AI', '工具', '黑科技'],
    content: "这绝对是打工人效率翻倍的秘密武器！今天分享 3 个不仅免费，而且好用到爆的 AI 工具。一键生成PPT、自动整理会议纪要... 记得先点赞收藏，免得以后找不到！",
    isFallback: true
  }
];

export const fetchRealtimeTrends = async (): Promise<TrendItem[]> => {
  if (!apiKey) {
    console.warn("API Key missing, using fallback trends.");
    return FALLBACK_TRENDS;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: "Search for the absolute latest trending topics (past 24 hours) on Chinese social media (Douyin, Weibo, XiaoHongShu). Select 6 distinct, viral topics suitable for content creation. Return them in a JSON Array.",
      config: {
        systemInstruction: `
          You are a trend researcher. 
          1. USE GOOGLE SEARCH to find real-time trending topics in China right now.
          2. Return exactly 6 items in a pure JSON Array format.
          3. Structure for each item: {"category": "...", "title": "...", "heat": "...", "tags": ["..."], "content": "..."}
          4. 'heat' should be a string like '500w+' or 'Top 1'.
          5. 'content' should be a short, engaging summary of why it is viral (the 'hook').
          6. Language: Chinese (Simplified).
          7. Output ONLY the JSON string. Do not use markdown code blocks like \`\`\`json.
        `,
        tools: [{ googleSearch: {} }],
      }
    });

    let responseText = response.text;
    if (!responseText) return FALLBACK_TRENDS;
    
    // Clean markdown formatting if present
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const trends = JSON.parse(responseText) as TrendItem[];
    
    // 简单的校验，确保返回了数组
    if (Array.isArray(trends) && trends.length > 0) {
      return trends;
    }
    return FALLBACK_TRENDS;

  } catch (error) {
    console.error("Error fetching trends (Network might be blocked), switching to fallback:", error);
    // 关键点：网络错误时返回备用数据池
    return FALLBACK_TRENDS;
  }
};

export const generateSocialContent = async (theme: string, styleReference?: string): Promise<GeneratedContent> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  try {
    let prompt = `Create viral social media content for the theme: "${theme}"`;
    let systemInstruction = BASE_SYSTEM_INSTRUCTION;

    if (styleReference) {
      systemInstruction += `
      
      *** CRITICAL INSTRUCTION: STYLE IMITATION MODE ***
      The user has provided a "Viral Reference" content. 
      1. ANALYZE the reference's: Tone, Sentence Length, Hook Structure, Emoji Usage, and Emotional Triggers.
      2. MIMIC this exact style and structure.
      3. APPLY the analyzed style to the new theme: "${theme}".
      
      Viral Reference to Imitate:
      """
      ${styleReference}
      """
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tiktok: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Shocking or questioning title" },
                visual_suggestions: { type: Type.STRING, description: "Visual direction like close-up, fast cuts" },
                script_0_3s: { type: Type.STRING, description: "The 0-3s hook" },
                script_3_15s: { type: Type.STRING, description: "The 3-15s pain point or twist" },
                script_15_45s: { type: Type.STRING, description: "The 15-45s solution" },
                script_ending: { type: Type.STRING, description: "Call to action" },
              },
              required: ["title", "visual_suggestions", "script_0_3s", "script_3_15s", "script_15_45s", "script_ending"],
            },
            rednote: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Attractive title with keywords and emoji" },
                content: { type: Type.STRING, description: "Main body text with multiple paragraphs and emojis" },
                tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 relevant hashtags" },
              },
              required: ["title", "content", "tags"],
            },
            twitter: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING, description: "First tweet to grab attention" },
                points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 main arguments or points" },
                summary: { type: Type.STRING, description: "Final summary or insight" },
              },
              required: ["hook", "points", "summary"],
            },
            ai_video: {
              type: Type.OBJECT,
              properties: {
                image_prompt: { type: Type.STRING, description: "Detailed Chinese prompt for AI video generation" },
              },
              required: ["image_prompt"],
            },
          },
          required: ["tiktok", "rednote", "twitter", "ai_video"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from AI");

    return JSON.parse(responseText) as GeneratedContent;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};