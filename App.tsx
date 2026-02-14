
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import { encode, decode, decodeAudioData } from './audioUtils';
import { AtmosphereType, SessionStatus } from './types';
import { Visualizer } from './components/Visualizer';

// Configuration
const STORY_IMAGE_URL = 'https://picsum.photos/id/1025/800/600'; // Cute dog photo
const SESSION_DURATION_SECONDS = 60;

const App: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [atmosphere, setAtmosphere] = useState<AtmosphereType>('default');
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_SECONDS);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  // Fix: Avoid using NodeJS.Timeout in browser environment. Use any or specific browser timer type.
  const timerRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Function to handle the magic atmosphere change (Tool Call)
  const applyAtmosphere = useCallback((newTheme: string) => {
    const validThemes: AtmosphereType[] = ['sunny', 'night', 'party', 'underwater'];
    if (validThemes.includes(newTheme as AtmosphereType)) {
      setAtmosphere(newTheme as AtmosphereType);
      return "The atmosphere has been changed to " + newTheme + "!";
    }
    return "Theme not found.";
  }, []);

  const stopConversation = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setStatus(SessionStatus.FINISHED);
    setIsModelSpeaking(false);
    
    // Stop all playing audio
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
  }, []);

  useEffect(() => {
    if (status === SessionStatus.ACTIVE && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopConversation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, timeLeft, stopConversation]);

  const startConversation = async () => {
    try {
      // Check if API key is configured
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        setError("Please set your Gemini API key in .env.local file");
        setStatus(SessionStatus.ERROR);
        return;
      }

      setStatus(SessionStatus.CONNECTING);
      setError(null);
      setTimeLeft(SESSION_DURATION_SECONDS);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Setup Audio Contexts
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are a friendly, magical storyteller friend for a young child.
            The child is looking at a picture of a cute puppy in a blanket. 
            Your goal is to have a 1-minute conversation with them about the puppy. 
            Ask them friendly questions like "What do you think the puppy is dreaming about?" or "What should we name him?".
            Be proactive: START the conversation as soon as you connect. 
            If the child mentions "magic", "change", or "different", you can use the 'setAtmosphere' tool to change the background to 'sunny', 'night', 'party', or 'underwater'. 
            Keep your responses short, warm, and engaging for a 5-year-old.`,
          tools: [{
            functionDeclarations: [{
              name: 'setAtmosphere',
              description: 'Changes the visual atmosphere of the screen.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  theme: {
                    type: Type.STRING,
                    description: 'The theme name: sunny, night, party, or underwater.'
                  }
                },
                required: ['theme']
              }
            }]
          }]
        },
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.ACTIVE);
            
            // Microphone input processing
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              // Fix: CRITICAL: Solely rely on sessionPromise resolves and then call session.sendRealtimeInput, do not add other condition checks.
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'setAtmosphere') {
                  const result = applyAtmosphere(fc.args.theme as string);
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result } }
                  }));
                }
              }
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsModelSpeaking(true);
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              setIsModelSpeaking(false);
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error(e);
            setError("Oops! Something went wrong with our magic connection.");
            setStatus(SessionStatus.ERROR);
          },
          onclose: () => {
            setStatus(SessionStatus.FINISHED);
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setError("We couldn't reach the magic storyteller. Is your microphone on?");
      setStatus(SessionStatus.ERROR);
    }
  };

  const atmosphereClasses: Record<AtmosphereType, string> = {
    default: 'bg-sky-50',
    sunny: 'bg-yellow-100 ring-16 ring-yellow-300 ring-inset',
    night: 'bg-indigo-950 text-white brightness-75',
    party: 'bg-pink-100 animate-pulse ring-16 ring-purple-300 ring-inset',
    underwater: 'bg-cyan-200 ring-16 ring-blue-500 ring-inset opacity-90'
  };

  return (
    <div className={`min-h-screen transition-all duration-1000 flex flex-col ${atmosphereClasses[atmosphere]}`}>
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-white/50 backdrop-blur-md shadow-sm">
        <h1 className="text-2xl font-kids text-purple-600 flex items-center gap-2">
          ✨ Story Friend
        </h1>
        {status === SessionStatus.ACTIVE && (
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-inner border-2 border-purple-200">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-kids text-lg text-purple-600 tabular-nums">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row p-6 gap-8 items-center justify-center max-w-6xl mx-auto w-full">
        {/* Left: Image Display */}
        <div className="flex-1 w-full max-w-lg">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-white group">
            <img 
              src={STORY_IMAGE_URL} 
              alt="Magic Story Image" 
              className={`w-full h-auto transition-transform duration-700 group-hover:scale-105 ${atmosphere === 'night' ? 'grayscale-[0.3]' : ''}`}
            />
            {atmosphere === 'underwater' && (
              <div className="absolute inset-0 bg-cyan-400/20 pointer-events-none" />
            )}
            {atmosphere === 'party' && (
              <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-yellow-500/10 pointer-events-none mix-blend-overlay" />
            )}
          </div>
          <p className="text-center mt-4 font-kids text-xl text-slate-600">
            Meet your new puppy friend! 🐶
          </p>
        </div>

        {/* Right: Interaction Controls */}
        <div className="w-full md:w-80 flex flex-col items-center gap-8">
          <div className="bg-white/80 p-8 rounded-3xl shadow-xl w-full flex flex-col items-center gap-6 border-2 border-white">
            <Visualizer isActive={status === SessionStatus.ACTIVE} isModelSpeaking={isModelSpeaking} />

            {status === SessionStatus.IDLE || status === SessionStatus.FINISHED ? (
              <button
                onClick={startConversation}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-kids text-xl py-4 px-8 rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <span>Say Hello!</span>
                <span className="text-2xl">👋</span>
              </button>
            ) : status === SessionStatus.CONNECTING ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-kids text-purple-600">Connecting Magic...</span>
              </div>
            ) : (
              <button
                onClick={stopConversation}
                className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-kids text-lg py-4 px-8 rounded-2xl transition-colors border-2 border-red-200 flex items-center justify-center gap-2"
              >
                <span>Bye Bye!</span>
                <span>👋</span>
              </button>
            )}

            {error && (
              <div className="text-red-500 text-sm font-semibold bg-red-50 p-3 rounded-lg text-center">
                {error}
              </div>
            )}
          </div>

          <div className="text-center space-y-2 opacity-80">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Magic Themes Active</p>
            <div className="flex gap-2 justify-center">
               {['sunny', 'night', 'party', 'underwater'].map(t => (
                 <div key={t} className={`w-3 h-3 rounded-full ${atmosphere === t ? 'bg-purple-600 scale-125' : 'bg-slate-300'}`} />
               ))}
            </div>
            <p className="text-[10px] text-slate-400 italic">Try saying: "Can you do a magic trick?"</p>
          </div>
        </div>
      </main>

      {/* Floating Elements for Atmosphere */}
      {atmosphere === 'sunny' && (
        <div className="absolute top-20 right-20 text-6xl float-animation">☀️</div>
      )}
      {atmosphere === 'night' && (
        <div className="absolute top-20 right-20 text-6xl float-animation">🌙</div>
      )}
      {atmosphere === 'underwater' && (
        <>
          <div className="absolute top-40 left-10 text-4xl animate-bounce">🫧</div>
          <div className="absolute bottom-20 right-10 text-4xl animate-bounce delay-300">🫧</div>
        </>
      )}
      {atmosphere === 'party' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-1/4 text-4xl animate-bounce">🎈</div>
          <div className="absolute top-20 right-1/4 text-4xl animate-bounce delay-500">🎉</div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="p-4 text-center text-slate-400 text-sm">
        Powered by Gemini Real-Time Voice ✨
      </footer>
    </div>
  );
};

export default App;
