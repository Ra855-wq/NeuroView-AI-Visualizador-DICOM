import { GoogleGenAI } from "@google/genai";

// Initialize the client. 
// NOTE: In a real production app, you might proxy this through a backend to hide the key,
// or require the user to input their own key if it's a client-side only tool.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_TEXT = 'gemini-3-pro-preview'; // Upgraded for complex medical reasoning
const MODEL_VISION = 'gemini-3-pro-preview'; // Upgraded for high-quality image understanding

export const geminiService = {
  /**
   * Sends a text-only message to the model.
   */
  async chat(message: string, history: {role: string, parts: {text: string}[]}[] = []): Promise<string> {
    try {
      // Basic chat structure without history persistence in this simplified service, 
      // but in a real app use ai.chats.create
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: [
            ...history.map(h => ({ role: h.role, parts: h.parts })),
            { role: 'user', parts: [{ text: message }] }
        ],
        config: {
            systemInstruction: "Você é um assistente médico útil da IA NeuroView. Você auxilia com definições médicas gerais, terminologia DICOM e conceitos de radiologia. Não forneça diagnósticos médicos definitivos (sempre sugira consultar um médico). Mantenha as respostas concisas e profissionais. RESPOSTA OBRIGATÓRIA EM PORTUGUÊS DO BRASIL (PT-BR)."
        }
      });
      return response.text || "Nenhuma resposta gerada.";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "Desculpe, encontrei um erro ao comunicar com o serviço de IA.";
    }
  },

  /**
   * Analyzes an image with a prompt.
   */
  async analyzeImage(base64Data: string, prompt: string): Promise<string> {
    try {
      // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
      const cleanBase64 = base64Data.split(',')[1] || base64Data;
      
      const response = await ai.models.generateContent({
        model: MODEL_VISION,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
              }
            },
            {
              text: prompt
            }
          ]
        },
        config: {
             systemInstruction: "Você é um scanner de diagnóstico por imagem avançado e assistente especialista em radiologia. Analise a imagem médica fornecida detalhadamente. Descreva estruturas anatômicas, anomalias potenciais (destacando incertezas) e qualidade da imagem. Use terminologia médica profissional. RESPOSTA OBRIGATÓRIA EM PORTUGUÊS DO BRASIL (PT-BR). Formate a resposta como um laudo técnico preliminar."
        }
      });

      return response.text || "A análise falhou ao gerar texto.";
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      return "Não foi possível analisar a imagem neste momento. Verifique sua chave de API e conexão.";
    }
  }
};