import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicrophoneButtonProps {
    isRecording: boolean;
    isProcessing: boolean;
    onClick: () => void;
    disabled?: boolean;
}

export function MicrophoneButton({ isRecording, isProcessing, onClick, disabled }: MicrophoneButtonProps) {
    return (
        <div className="relative flex items-center justify-center">
            {/* Ripple Effect Ring */}
            {isRecording && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
            )}

            <Button
                onClick={onClick}
                disabled={disabled || isProcessing}
                className={cn(
                    "h-24 w-24 rounded-full shadow-xl transition-all duration-300 transform active:scale-95",
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
