import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    permissionError: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Check supported mime type
    const getMimeType = () => {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            '' // Default fallback
        ];
        if (typeof MediaRecorder === 'undefined') return '';
        return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    };

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mimeType = getMimeType();
            const options = mimeType ? { mimeType } : undefined;

            const mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = []; // Reset chunks

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setPermissionError(null);
        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            // Detailed error handling for iOS/Safari
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError("Microphone permission denied. Please enable it in settings.");
            } else {
                setPermissionError("Could not access microphone.");
            }
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
            return null;
        }

        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current!;

            mediaRecorder.onstop = () => {
                let mimeType = mediaRecorder.mimeType || 'audio/webm';
                if (!mimeType || mimeType === '') mimeType = 'audio/mp4';

                // Mobile Safari workaround: sometimes gives empty mimeType but works with mp4 container logic or plain blob
                // We'll trust the captured chunks.
                const audioBlob = new Blob(chunksRef.current, { type: mimeType });

                // Stop all tracks to release microphone
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
                resolve(audioBlob);
            };

            mediaRecorder.stop();
        });
    }, []);

    return { isRecording, startRecording, stopRecording, permissionError };
}
