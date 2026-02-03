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
            // 1. Get the stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Create MediaRecorder without forcing mimeType.
            // iOS Safari works best when allowed to choose its default (typically audio/mp4).
            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = []; // Reset chunks

            // 3. Handle data availability
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    // console.log("Chunk received:", event.data.size);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event);
            };

            // 4. Start recording with a timeslice.
            // CRITICAL FOR IOS: Passing a timeslice (e.g. 1000ms) forces dataavailable events 
            // to fire periodically, preventing the recorder from hanging or returning empty data on stop.
            mediaRecorder.start(1000);

            setIsRecording(true);
            setPermissionError(null);
        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError("Microphone permission denied. Please enable it in settings.");
            } else {
                setPermissionError("Could not access microphone. " + err.message);
            }
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return null;

        return new Promise((resolve) => {
            const cleanup = () => {
                // Stop all media tracks to release the microphone
                if (recorder.stream) {
                    recorder.stream.getTracks().forEach(track => track.stop());
                }
                setIsRecording(false);

                // Create the final blob
                if (chunksRef.current.length === 0) {
                    console.warn("No audio chunks recorded");
                    resolve(null);
                    return;
                }

                // Detect type or fallback to mp4 (safest for iOS)
                const type = recorder.mimeType || 'audio/mp4';
                const audioBlob = new Blob(chunksRef.current, { type });
                resolve(audioBlob);
            };

            if (recorder.state === 'inactive') {
                cleanup();
            } else {
                // Force stop and wait for onstop event
                recorder.onstop = cleanup;
                recorder.stop();
            }
        });
    }, []);

    return { isRecording, startRecording, stopRecording, permissionError };
}
