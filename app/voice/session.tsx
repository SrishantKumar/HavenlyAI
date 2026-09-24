import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { liveKitTokenService } from '../../services/livekit/liveKitTokenService';
import { liveKitService } from '../../services/livekit/liveKitService';
import { geminiLiveService } from '../../services/ai/geminiLiveService';
import { CONFIG } from '../../constants/config';
import Header from '../../components/ui/Header';
import LiveVoiceRoom from '../../components/live/LiveVoiceRoom';

export default function VoiceSessionScreen() {
  const router = useRouter();
  const { 
    theme, 
    user,
    voiceSessionState, 
    setVoiceSessionState, 
    isMuted 
  } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  // Active session transcripts
  const [transcript, setTranscript] = useState<{ text: string; role: 'user' | 'model' }[]>([]);
  const roomNameRef = useRef<string | null>(null);

  // Simulated Voice Conversation Loop (Demo Mode)
  const demoIntervalRef = useRef<any>(null);

  const startVoiceSession = async () => {
    setVoiceSessionState('requesting');
    setTranscript([]);

    try {
      // 1. Request temporary LiveKit token from backend proxy
      const userId = user?.id || 'usr_001';
      const sessionCredentials = await liveKitTokenService.requestVoiceSession(userId);
      roomNameRef.current = sessionCredentials.roomName;

      // 2. Configure LiveKit Webrtc callbacks
      liveKitService.setCallbacks({
        onConnectionStateChanged: (state) => {
          if (state === 'connected') {
            setVoiceSessionState('connected');
          } else if (state === 'connecting') {
            setVoiceSessionState('connecting');
          } else if (state === 'reconnecting') {
            setVoiceSessionState('reconnecting');
          } else if (state === 'error') {
            setVoiceSessionState('error');
          }
        },
        onAudioTrackSubscribed: (track) => {
          // Playback native LiveKit Audio track
          setVoiceSessionState('speaking');
        },
        onAudioTrackUnsubscribed: () => {
          setVoiceSessionState('listening');
        }
      });

      // 3. Configure Gemini Live WebSocket Callbacks
      geminiLiveService.setCallbacks({
        onStateChanged: (state) => {
          console.log('Gemini Live State changed:', state);
          if (state === 'connected') {
            setVoiceSessionState('listening');
          } else if (state === 'connecting') {
            setVoiceSessionState('connecting');
          } else if (state === 'error') {
            setVoiceSessionState('error');
          } else if (state === 'disconnected') {
            setVoiceSessionState('ended');
          }
        },
        onTranscriptReceived: (text, role) => {
          setTranscript(prev => {
            // Filter out empty model starts from the accumulated list to keep display clean
            if (text === '' && role === 'model') {
              return prev;
            }
            if (prev.length > 0 && prev[prev.length - 1].role === role) {
              const next = [...prev];
              next[next.length - 1] = { text, role };
              return next;
            }
            return [...prev, { text, role }];
          });

          if (role === 'model') {
            if (text === '') {
              setVoiceSessionState('thinking');
            } else {
              setVoiceSessionState('speaking');
            }
          } else {
            setVoiceSessionState('listening');
          }
        },
        onAudioReceived: (chunk) => {
          setVoiceSessionState('speaking');
        },
        onInterrupted: () => {
          console.log('Gemini Live: User interrupted AI playback');
          setVoiceSessionState('listening');
          setTranscript(prev => [...prev, { text: '[Interrupted]', role: 'model' }]);
        }
      });

      // 4. Initiate connection
      if (!CONFIG.geminiApiKey) {
        await liveKitService.connect(sessionCredentials.wsUrl, sessionCredentials.token);
      }
      await geminiLiveService.connect(sessionCredentials.wsUrl, sessionCredentials.token);
      
      setVoiceSessionState('listening');

      // If Demo Mode is active, run local conversational loop simulation
      if (CONFIG.isDemoMode) {
        runDemoSimulation();
      }

    } catch (e) {
      console.error('Failed to initiate voice session:', e);
      setVoiceSessionState('error');
    }
  };

  const runDemoSimulation = () => {
    let index = 0;
    const demoConversation = [
      { role: 'model' as const, text: "Hello! I'm here and listening. Take your time, what's on your mind today?" },
      { role: 'user' as const, text: "I've been feeling a bit stressed about work." },
      { role: 'model' as const, text: "Work stress can be a lot to hold. What's taking up the most space for you?" },
      { role: 'user' as const, text: "Just managing timelines and feeling like I can't catch a break." },
      { role: 'model' as const, text: "That pressure is exhausting. Remember to take a slow breath. You don't have to carry it all today." }
    ];

    // Trigger initial welcome response
    setTimeout(() => {
      setVoiceSessionState('speaking');
      setTranscript(prev => [...prev, demoConversation[0]]);
      index = 1;
      setVoiceSessionState('listening');
    }, 1500);

    // Run dialogue loop
    demoIntervalRef.current = setInterval(() => {
      if (index >= demoConversation.length) {
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        return;
      }

      const nextMessage = demoConversation[index];
      if (nextMessage.role === 'user') {
        // User speaks
        setVoiceSessionState('listening');
        setTranscript(prev => [...prev, nextMessage]);
        index++;
      } else {
        // AI processes and answers
        setVoiceSessionState('thinking');
        setTimeout(() => {
          setVoiceSessionState('speaking');
          setTranscript(prev => [...prev, nextMessage]);
          index++;
          setTimeout(() => {
            setVoiceSessionState('listening');
          }, 3000);
        }, 1200);
      }
    }, 6500);
  };

  const handleEndSession = async () => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    
    setVoiceSessionState('ended');
    try {
      if (!CONFIG.geminiApiKey) {
        await liveKitService.disconnect();
      }
      geminiLiveService.disconnect();
      if (roomNameRef.current) {
        await liveKitTokenService.endVoiceSession(roomNameRef.current);
      }
    } catch (e) {
      console.warn(e);
    }
    
    // Return to sanctuary home
    router.back();
  };

  useEffect(() => {
    startVoiceSession();
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      if (!CONFIG.geminiApiKey) {
        liveKitService.disconnect();
      }
      geminiLiveService.disconnect();
    };
  }, []);

  // Update native microphone mute status in response to store changes
  useEffect(() => {
    if (!CONFIG.geminiApiKey) {
      liveKitService.muteMicrophone(isMuted);
    }
  }, [isMuted]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Talk with HavenlyAI" rightAction="safety" />
      <View style={styles.content}>
        <LiveVoiceRoom
          onEndSession={handleEndSession}
          transcript={transcript}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT.spacing.lg,
  },
});
