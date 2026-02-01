'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Globe, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState('');

  const createRoom = () => {
    // Generate a simple random room ID for MVP
    const roomId = Math.random().toString(36).substring(2, 9);
    router.push(`/room/${roomId}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      router.push(`/room/${joinRoomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-full shadow-lg mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Couple Translator</h1>
          <p className="text-slate-500">
            Real-time simultaneous interpretation for heart-to-heart conversations.
          </p>
        </div>

        <Card className="border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle>Start a Conversation</CardTitle>
            <CardDescription>
              Create a new room or join an existing one with your partner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createRoom} 
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <Globe className="mr-2 h-5 w-5" />
              Create New Room
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or join existing</span>
              </div>
            </div>

            <form onSubmit={joinRoom} className="flex gap-2">
              <Input
                placeholder="Enter Room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="h-12"
              />
              <Button type="submit" variant="outline" className="h-12 px-6" disabled={!joinRoomId.trim()}>
                Join
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-center text-xs text-slate-400 justify-center">
            Optimized for iPhone + AirPods
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
