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

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus' // Web standard
            });

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
            mediaRecorderRef.current!.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                // Stop all tracks to release microphone
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
                resolve(audioBlob);
            };

            mediaRecorderRef.current!.stop();
        });
    }, []);

    return { isRecording, startRecording, stopRecording, permissionError };
}
