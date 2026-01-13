
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-3-pro-preview';

export const geminiService = {
  /**
   * Envia uma mensagem para o modelo Gemini 3 Pro.
   * A instância é criada no momento da chamada para capturar o process.env.API_KEY mais recente.
   */
  async chat(message: string, history: {role: string, parts: {text: string}[]}[] = []): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
            ...history.map(h => ({ role: h.role, parts: h.parts })),
            { role: 'user', parts: [{ text: message }] }
        ],
        config: {
            systemInstruction: "Você é um especialista em neuro-radiologia da NeuroView AI. Analise os dados fornecidos e responda de forma técnica e precisa em Português (PT-BR). Priorize clareza sobre anatomia e possíveis patologias."
        }
      });
      return response.text || "O modelo não retornou conteúdo.";
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      if (error?.message?.includes("API key not found") || error?.message?.includes("403")) {
        return "ERRO DE AUTENTICAÇÃO: Chave de API não detectada ou inválida. Por favor, utilize o instalador para configurar sua chave.";
      }
      return `Erro na análise: ${error?.message || "Erro desconhecido"}`;
    }
  },

  /**
   * Analisa uma imagem médica utilizando visão computacional do Gemini 3 Pro.
   */
  async analyzeImage(base64Data: string, prompt: string): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const cleanBase64 = base64Data.split(',')[1] || base64Data;
      
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
              }
            },
            { text: prompt }
          ]
        },
        config: {
             systemInstruction: "Você é um radiologista sênior. Sua tarefa é descrever achados em imagens de tomografia, ressonância ou raio-x. Seja formal, use termos médicos brasileiros e aponte áreas de interesse se houver anomalias visíveis."
        }
      });

      return response.text || "Não foi possível gerar uma descrição para esta imagem.";
    } catch (error: any) {
      console.error("Gemini Vision Error:", error);
      return `Falha no processamento de imagem: ${error?.message || "Verifique sua conexão e chave de API."}`;
    }
  }
};
