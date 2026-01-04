
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getRecipeSummary = async (title: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `다음 요리 영상의 제목과 설명을 바탕으로 핵심 재료와 3단계 요리 순서를 간단하게 요약해줘. 한국어로 작성해줘.\n제목: ${title}\n설명: ${description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ingredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "핵심 재료 리스트"
            },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "요리 순서 3단계"
            },
            tip: {
              type: Type.STRING,
              description: "요리 꿀팁 한줄"
            }
          },
          required: ["ingredients", "steps", "tip"]
        }
      }
    });

    // Fix: response.text is a property that can be undefined; safely handle it before JSON.parse
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
