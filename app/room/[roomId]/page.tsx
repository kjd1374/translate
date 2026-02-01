'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MicrophoneButton } from '@/components/MicrophoneButton';
import { TranscriptView } from '@/components/TranscriptView';
import { Message, Language } from '@/lib/types';
import { ArrowLeft, Share2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [myLanguage, setMyLanguage] = useState<Language>('ko');

    // Hooks
    const { isRecording, startRecording, stopRecording, permissionError } = useAudioRecorder();

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const toggleRecording = async () => {
        if (isRecording) {
            await handleStopRecording();
        } else {
            await startRecording();
        }
    };

    const handleStopRecording = async () => {
        setIsProcessing(true);
        const audioBlob = await stopRecording();

        if (audioBlob) {
            await processAudio(audioBlob);
        } else {
            setIsProcessing(false);
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('sourceLang', myLanguage);
            formData.append('targetLang', myLanguage === 'ko' ? 'vi' : 'ko');

            const response = await fetch('/api/translate', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Translation failed');
            }

            const newMessage: Message = {
                id: Date.now().toString(),
                role: 'user', // In this MVP, I am always the user
                originalText: data.originalText,
                translatedText: data.translatedText,
                timestamp: Date.now(),
                language: myLanguage,
                // audioUrl is optional/undefined now
            };

            setMessages(prev => [...prev, newMessage]);

            // Auto play audio (Browser TTS)
            speakText(data.translatedText, myLanguage === 'ko' ? 'vi' : 'ko');

        } catch (error) {
            console.error("Processing error:", error);
            alert("Failed to process audio. Check console.");
        } finally {
            setIsProcessing(false);
        }
    };

    const speakText = (text: string, lang: Language) => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            // Cancel current speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            // 'vi-VN' for Vietnamese, 'ko-KR' for Korean
            utterance.lang = lang === 'vi' ? 'vi-VN' : 'ko-KR';
            window.speechSynthesis.speak(utterance);
        }
    };

    const handlePlayAudio = (msg: Message) => {
        const targetLang = msg.language === 'ko' ? 'vi' : 'ko';
        speakText(msg.translatedText, targetLang);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
                <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Button>

                <div className="flex flex-col items-center">
                    <h1 className="font-semibold text-slate-800">Room: {roomId}</h1>
                    <div className="text-xs text-green-500 font-medium flex items-center gap-1">
                        <span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Connected
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                        <Share2 className="h-5 w-5 text-slate-600" />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-4 gap-4 max-w-lg mx-auto w-full overflow-hidden">
                {/* Permission Error Alert */}
                {permissionError && (
                    <div className="bg-red-100 text-red-700 p-3 rounded text-sm text-center">
                        {permissionError}
                    </div>
                )}

                {/* Language Handover */}
                <Card className="p-1 flex rounded-full bg-slate-200 border-none shrink-0">
                    <button
                        onClick={() => setMyLanguage('ko')}
                        className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${myLanguage === 'ko' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                            }`}
                    >
                        🇰🇷 한국어 (Me)
                    </button>
                    <button
                        onClick={() => setMyLanguage('vi')}
                        className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${myLanguage === 'vi' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
                            }`}
                    >
                        🇻🇳 Tiếng Việt (Me)
                    </button>
                </Card>

                {/* Transcript */}
                <div className="flex-1 min-h-0">
                    <TranscriptView messages={messages} onPlayAudio={handlePlayAudio} />
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center justify-center pb-8 pt-4 shrink-0 space-y-2">
                    <div className="text-sm font-medium text-slate-500 h-5">
                        {isRecording ? "Listening..." : isProcessing ? "Translating..." : "Tap to Speak"}
                    </div>
                    <MicrophoneButton
                        isRecording={isRecording}
                        isProcessing={isProcessing}
                        onClick={toggleRecording}
                        disabled={!!permissionError}
                    />
                </div>
            </main>

            <audio ref={audioRef} className="hidden" />
        </div>
    );
}
