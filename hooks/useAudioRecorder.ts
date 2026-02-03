import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    permissionError: string | null;
    volume: number; // 0 to 100
}

export function useAudioRecorder(log?: (msg: string) => void): UseAudioRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [volume, setVolume] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Audio Analysis Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const safeLog = useCallback((msg: string) => {
        if (log) log(msg);
        else console.log(msg);
    }, [log]);

    const cleanupAudioAnalysis = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.error("Ctx close error", e));
            audioContextRef.current = null;
        }
        setVolume(0);
    };

    const startAnalysis = (stream: MediaStream) => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceRef.current = source;

            // CRITICAL FOR IOS: Resume context if it's suspended (it usually is)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = () => {
                analyser.getByteFrequencyData(dataArray);

                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;

                // Make it more sensitive: scale up a bit more dynamically
                // typical average is 10-50 for speech
                const vol = Math.min(100, Math.round((average / 60) * 100));
                setVolume(vol);

                if (audioContextRef.current?.state === 'running') {
                    animationFrameRef.current = requestAnimationFrame(updateVolume);
                }
            };
            updateVolume();
        } catch (e: any) {
            safeLog("Audio Analysis Error: " + e.message);
        }
    };

    const startRecording = useCallback(async () => {
        try {
            safeLog("Requesting microphone permission...");
            // OPTIMIZATION: Low bandwidth settings for faster upload
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            safeLog("Microphone access granted. Stream ID: " + stream.id);

            // Start Visualizer
            startAnalysis(stream);

            // Native MediaRecorder
            // Try to set lower bitrate for speed
            const options: MediaRecorderOptions = {
                audioBitsPerSecond: 32000,
            };

            // iOS might ignore bitsPerSecond or require specific mimeTypes. 
            // We verify support or fallback to default which works.
            let mediaRecorder: MediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
                // Fallback for iOS/Legacy if options fail
                safeLog("Low bitrate options failed, falling back to default");
                mediaRecorder = new MediaRecorder(stream);
            }

            safeLog(`MediaRecorder created. MimeType: ${mediaRecorder.mimeType}`);

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    // Log occasionally to prove life without spamming too much
                    if (chunksRef.current.length % 5 === 1) {
                        safeLog(`Recording... Chunks: ${chunksRef.current.length}, Last: ${event.data.size}b`);
                    }
                }
            };

            mediaRecorder.onerror = (event: any) => {
                safeLog("MediaRecorder Error: " + JSON.stringify(event.error));
            };

            mediaRecorder.onstart = () => {
                safeLog("MediaRecorder started.");
            };

            // 1s timeslice is critical for iOS
            mediaRecorder.start(1000);
            safeLog("mediaRecorder.start(1000) called");

            setIsRecording(true);
            setPermissionError(null);
        } catch (err: any) {
            safeLog("Error accessing microphone: " + err.message);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError("Microphone permission denied.");
            } else {
                setPermissionError("Could not access microphone: " + err.message);
            }
        }
    }, [safeLog]);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        safeLog("stopRecording triggered");
        const recorder = mediaRecorderRef.current;

        // Stop visualization loop
        cleanupAudioAnalysis();

        if (!recorder) {
            safeLog("No recorder instance found");
            return null;
        }

        return new Promise((resolve) => {
            const cleanup = () => {
                safeLog("Cleanup started");
                if (recorder.state !== 'inactive') {
                    try { recorder.stop(); } catch (e) { /* ignore */ }
                }

                if (recorder.stream) {
                    recorder.stream.getTracks().forEach(track => track.stop());
                }

                setIsRecording(false);

                const blobSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
                safeLog(`Total size: ${blobSize} bytes`);

                if (chunksRef.current.length === 0) {
                    safeLog("Warning: No audio chunks.");
                    resolve(null);
                } else {
                    const type = recorder.mimeType || 'audio/mp4';
                    safeLog(`Blob type: ${type}`);
                    const audioBlob = new Blob(chunksRef.current, { type });
                    resolve(audioBlob);
                }
            };

            const timeoutId = setTimeout(() => {
                safeLog("Forcing cleanup (timeout)");
                cleanup();
            }, 1000);

            recorder.onstop = () => {
                clearTimeout(timeoutId);
                cleanup();
            };

            if (recorder.state === 'inactive') {
                clearTimeout(timeoutId);
                cleanup();
            } else {
                recorder.stop();
            }
        });
    }, [safeLog]);

    return { isRecording, startRecording, stopRecording, permissionError, volume };
}
