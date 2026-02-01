export type Language = 'ko' | 'vi';

export interface Message {
    id: string;
    role: 'user' | 'partner';
    originalText: string;
    translatedText: string;
    timestamp: number;
    audioUrl?: string; // URL to the synthesized speech
    language: Language;
}
