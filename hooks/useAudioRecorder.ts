import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    permissionError: string | null;
}

export function useAudioRecorder(log: (msg: string) => void): UseAudioRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            log("Requesting microphone permission...");
            // 1. Get the stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            log("Microphone access granted. Stream ID: " + stream.id);

            // 2. Create MediaRecorder without forcing mimeType.
            // iOS Safari works best when allowed to choose its default (typically audio/mp4).
            const mediaRecorder = new MediaRecorder(stream);
            log(`MediaRecorder created. MimeType: ${mediaRecorder.mimeType} State: ${mediaRecorder.state}`);

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = []; // Reset chunks

            // 3. Handle data availability
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    // log(`Data chunk received: ${event.data.size} bytes`); // Too noisy
                }
            };

            mediaRecorder.onerror = (event: any) => {
                log("MediaRecorder Error: " + JSON.stringify(event.error));
            };

            mediaRecorder.onstart = () => {
                log("MediaRecorder started event fired.");
            };

            // 4. Start recording with a timeslice.
            // CRITICAL FOR IOS: Passing a timeslice (e.g. 1000ms) forces dataavailable events 
            // to fire periodically, preventing the recorder from hanging or returning empty data on stop.
            mediaRecorder.start(1000);
            log("mediaRecorder.start(1000) called");

            setIsRecording(true);
            setPermissionError(null);
        } catch (err: any) {
            log("Error accessing microphone: " + err.message);
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError("Microphone permission denied.");
            } else {
                setPermissionError("Could not access microphone: " + err.message);
            }
        }
    }, [log]);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        log("stopRecording triggered");
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
            log("No recorder instance found");
            return null;
        }

        return new Promise((resolve) => {
            // Define cleanup function to run on stop or timeout
            const cleanup = () => {
                log("Cleanup started");
                if (recorder.state !== 'inactive') {
                    try {
                        recorder.stop();
                    } catch (e) {
                        log("Stop error (ignore): " + e);
                    }
                }

                if (recorder.stream) {
                    recorder.stream.getTracks().forEach(track => {
                        track.stop();
                        log("Track stopped: " + track.kind);
                    });
                }

                setIsRecording(false);

                const blobSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
                log(`Total recorded size: ${blobSize} bytes`);

                if (chunksRef.current.length === 0) {
                    log("Warning: No audio chunks recorded");
                    resolve(null);
                } else {
                    const type = recorder.mimeType || 'audio/mp4'; // iOS Fallback
                    log(`Creating blob with type: ${type}`);
                    const audioBlob = new Blob(chunksRef.current, { type });
                    resolve(audioBlob);
                }
            };

            // iOS Safari Protection: If onstop doesn't fire within 1s, force cleanup
            const timeoutId = setTimeout(() => {
                log("Forcing cleanup due to timeout");
                cleanup();
            }, 1000);

            recorder.onstop = () => {
                log("Recorder onstop event fired");
                clearTimeout(timeoutId);
                cleanup();
            };

            if (recorder.state === 'inactive') {
                clearTimeout(timeoutId);
                cleanup();
            } else {
                recorder.stop();
                log("recorder.stop() called");
            }
        });
    }, [log]);

    return { isRecording, startRecording, stopRecording, permissionError };
}
