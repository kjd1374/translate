import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";
import { Button } from "./ui/button";

interface TranscriptViewProps {
    messages: Message[];
    onPlayAudio: (msg: Message) => void;
}

export function TranscriptView({ messages, onPlayAudio }: TranscriptViewProps) {
    return (
        <ScrollArea className="h-[calc(100vh-250px)] w-full rounded-md border p-4 bg-slate-50">
            <div className="space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 py-10">
                        Start talking to see the conversation here.
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex flex-col max-w-[85%] rounded-lg p-3 space-y-1 shadow-sm",
                            msg.role === 'user'
                                ? "ml-auto bg-blue-100 border-blue-200 text-right items-end"
                                : "mr-auto bg-white border-slate-200 items-start"
                        )}
                    >
                        <div className="font-medium text-slate-800 text-lg">
                            {msg.originalText}
                        </div>

                        <div className="flex items-center gap-2 text-slate-600 bg-black/5 px-2 py-1 rounded">
                            <span className="text-sm font-semibold">{msg.translatedText}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-1 hover:bg-black/10 rounded-full"
                                onClick={() => onPlayAudio(msg)}
                            >
                                <Volume2 className="h-3 w-3" />
                            </Button>
                        </div>

                        <span className="text-[10px] text-slate-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                {/* Invisible element to ensure scrolling to bottom if needed */}
                <div className="h-2" />
            </div>
        </ScrollArea>
    );
}
