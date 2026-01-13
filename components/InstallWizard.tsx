
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Activity, 
  BrainCircuit
} from './Icons';

interface InstallWizardProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'license' | 'installing' | 'complete';

export const InstallWizard: React.FC<InstallWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [progress, setProgress] = useState(0);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [isAccepted, setIsAccepted] = useState(false);

  const steps: Step[] = ['welcome', 'license', 'installing', 'complete'];
  const stepIndex = steps.indexOf(currentStep);

  const handleNext = () => {
    const next = steps[stepIndex + 1];
    if (next) setCurrentStep(next);
  };

  useEffect(() => {
    if (currentStep === 'installing') {
      const logs = [
        "Iniciando Deployment Global Cloud...",
        "Ignorando protocolos de login (Modo Aberto)...",
        "Sincronizando modelos Gemini 3 Pro...",
        "Configurando ambiente de alta disponibilidade...",
        "Finalizando workspace público v3.0.0..."
      ];
      
      let i = 0;
      const interval = setInterval(() => {
        if (i < logs.length) {
          setInstallLogs(prev => [...prev, logs[i]]);
          setProgress(((i + 1) / logs.length) * 100);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setCurrentStep('complete'), 800);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  return (
    <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0d0d0d] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[520px] animate-in zoom-in-95">
        
        <div className="bg-[#050505] px-8 py-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-500" size={24} />
            <h1 className="text-lg font-bold text-white uppercase tracking-tighter">NeuroView <span className="text-neutral-600 font-mono">v3.0</span></h1>
          </div>
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <div key={idx} className={`h-1 w-4 rounded-full transition-all ${idx <= stepIndex ? 'bg-blue-600' : 'bg-neutral-800'}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 p-10 flex flex-col justify-center">
          {currentStep === 'welcome' && (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-full w-fit mx-auto">
                <BrainCircuit size={48} className="text-blue-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">Bem-vindo à v3.0</h2>
                <p className="text-neutral-400 text-sm max-w-xs mx-auto">Edição Global: Acesso instantâneo sem necessidade de credenciais.</p>
              </div>
            </div>
          )}

          {currentStep === 'license' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-blue-500" size={20} /> Termos de Uso Global
              </h2>
              <div className="bg-black p-4 border border-neutral-800 rounded-xl h-40 overflow-y-auto text-[10px] font-mono text-neutral-500 leading-relaxed">
                NeuroView v3.0 é uma ferramenta de código aberto para visualização médica. O uso é de total responsabilidade do usuário. Os laudos gerados pela IA são sugestões preliminares e não substituem o diagnóstico médico profissional.
              </div>
              <button onClick={() => setIsAccepted(!isAccepted)} className="flex items-center gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-xl w-full transition-colors hover:border-blue-500/50">
                <input type="checkbox" checked={isAccepted} readOnly className="accent-blue-600 w-4 h-4" />
                <span className="text-xs text-neutral-300">Aceito os termos da Edição Global v3.</span>
              </button>
            </div>
          )}

          {currentStep === 'installing' && (
            <div className="space-y-6 py-10 animate-in fade-in">
              <div className="flex justify-between text-xs font-mono text-blue-500 mb-2">
                <span className="animate-pulse">CONFIGURANDO AMBIENTE...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="bg-black p-4 border border-neutral-800 h-32 font-mono text-[9px] text-neutral-600 overflow-hidden flex flex-col justify-end">
                {installLogs.map((log, i) => <div key={i} className="mb-1 text-blue-500/70 opacity-80 animate-in slide-in-from-left-2">&gt; {log}</div>)}
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in zoom-in-95">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                <CheckCircle2 size={80} className="text-blue-500 relative z-10" />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white tracking-tight">Sistema Pronto</h2>
                <p className="text-neutral-400 text-sm mt-1">Sua estação de trabalho v3.0 foi liberada.</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#050505] px-8 py-6 border-t border-neutral-800 flex justify-between items-center">
          <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">BUILD_ID: 3.0.0-PUBLIC</span>
          <div className="flex gap-4">
            {currentStep === 'complete' ? (
              <button 
                onClick={() => { localStorage.setItem('nv_installed', 'true'); onComplete(); }}
                className="px-10 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                Entrar no Workspace
              </button>
            ) : (currentStep !== 'installing') && (
              <button 
                onClick={handleNext} 
                disabled={currentStep === 'license' && !isAccepted}
                className="px-10 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                Avançar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
