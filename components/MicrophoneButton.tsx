import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicrophoneButtonProps {
    isRecording: boolean;
    isProcessing: boolean;
    onClick: () => void;
    disabled?: boolean;
    volume?: number; // 0-100
}

export function MicrophoneButton({ isRecording, isProcessing, onClick, disabled, volume = 0 }: MicrophoneButtonProps) {
    // Calculate scale based on volume (1.0 to 1.5)
    // Only apply when recording
    const scale = isRecording ? 1 + (volume / 200) : 1;

    return (
        <div className="relative flex items-center justify-center h-32 w-32">
            {/* Ripple Effect Ring - Dynamic based on volume */}
            {isRecording && (
                <span
                    className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-30 transition-transform duration-75"
                    style={{ transform: `scale(${1 + (volume / 100)})` }}
                />
            )}

            <Button
                onClick={onClick}
                disabled={disabled || isProcessing}
                style={{ transform: `scale(${scale})` }}
                className={cn(
                    "h-24 w-24 rounded-full shadow-xl transition-all duration-100 z-10",
                    isRecording
                        ? "bg-red-500 hover:bg-red-600 border-4 border-red-200"
                        : "bg-blue-600 hover:bg-blue-700 border-4 border-blue-200",
                    isProcessing && "opacity-80 cursor-not-allowed"
                )}
            >
                {isProcessing ? (
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                ) : isRecording ? (
                    <Square className="h-10 w-10 text-white fill-current" />
                ) : (
                    <Mic className="h-10 w-10 text-white" />
                )}
            </Button>
        </div>
    );
}
