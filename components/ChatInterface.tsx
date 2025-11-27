import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, BrainCircuit, Activity } from './Icons';
import { geminiService } from '../services/geminiService';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        // Construct history for context
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await geminiService.chat(input, history);
        
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
        setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
        const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Erro ao conectar com a IA." };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-200 font-semibold">
            <Activity size={18} className="text-blue-500" />
            <span>Assistente</span>
        </div>
        <div className="text-[10px] bg-neutral-800 px-2 py-1 rounded text-green-500">
            Gemini 3 Pro
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
            <div className="text-center mt-10 text-neutral-600">
                <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">Pronto para auxiliar na análise DICOM.</p>
            </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-neutral-800 text-gray-200 rounded-bl-none border border-neutral-700'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
            <div className="flex justify-start animate-pulse">
                <div className="bg-neutral-800 rounded-2xl rounded-bl-none px-4 py-3 border border-neutral-700 flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                </div>
            </div>
        )}
      </div>

      <div className="p-4 border-t border-neutral-800">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-neutral-800 text-gray-200 rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-neutral-700 placeholder-neutral-500 transition-all"
            placeholder="Pergunte sobre achados..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isTyping}
          />
          <button 
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 p-1 transition-colors disabled:opacity-50"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;