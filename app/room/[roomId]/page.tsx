'use client';

import { useState, useRef, useEffect } from 'react';
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
    const { isRecording, startRecording, stopRecording, permissionError, volume } = useAudioRecorder();

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Pusher Subscription
    useEffect(() => {
        const initPusher = async () => {
            // Dynamically import to avoid server-side issues (though 'use client' handles most)
            const { pusherClient } = await import('@/lib/pusher');

            const channel = pusherClient.subscribe(`room-${roomId}`);

            channel.bind('translated-message', (data: any) => {
                console.log("Pusher Event:", data);

                // Add to transcript
                const newMessage: Message = {
                    id: data.id,
                    role: 'user',
                    originalText: data.originalText,
                    translatedText: data.translatedText,
                    timestamp: data.timestamp,
                    language: data.sourceLang as Language,
                };

                setMessages(prev => {
                    // Avoid duplicates if we optimistically added our own (though we aren't optimistically adding yet)
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });

                // AUTO-PLAY LOGIC:
                // I speak Korean (myLanguage='ko'), Message is from VN (source='vi') -> Play KR (target='ko')
                // I speak VN (myLanguage='vi'), Message is from KR (source='ko') -> Play VN (target='vi')

                // If the message source is DIFFERENT from my language, it means it's an incoming message for me to hear.
                if (data.sourceLang !== myLanguage) {
                    speakText(data.translatedText, myLanguage);
                }
            });

            return () => {
                pusherClient.unsubscribe(`room-${roomId}`);
            };
        };

        if (roomId) {
            initPusher();
        }
    }, [roomId, myLanguage]);

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
            formData.append('roomId', roomId); // Pass roomId for Pusher

            const response = await fetch('/api/translate', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Translation failed');
            }

            // Note: We do NOT add the message to state here manually.
            // We wait for the Pusher event to come back to ensure synchronization.
            // (Round trip latency is strictly better for consistency in this MVP)

        } catch (error: any) {
            console.error("Processing error:", error);
            alert("Translation failed. Please try again.");
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
                        volume={volume}
                    />
                </div>
            </main>

            <audio ref={audioRef} className="hidden" />
        </div>
    );
}
