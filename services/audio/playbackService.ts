import { Platform } from 'react-native';
import { useAppStore } from '../../store/useAppStore';

let createAudioPlayer: any = null;
let setAudioModeAsync: any = null;

try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  console.warn('expo-audio package not found or failed to load in playbackService.');
}

let playerInstance: any = null;
let onPlaybackStatusUpdateCallback: ((status: any) => void) | null = null;
let activeUtterance: any = null;
let statusInterval: any = null;

export const playbackService = {
  /**
   * Loads and starts playback of a given audio file URL or local path.
   */
  async play(
    uri: string,
    onStatusUpdate?: (status: any) => void
  ): Promise<void> {
    try {
      // 1. Unload any active playing sound or speech
      await this.stop();

      onPlaybackStatusUpdateCallback = onStatusUpdate || null;

      // Handle custom speech synthesis URI fallback for serverless web or native mobile environments
      if (uri.startsWith('speech://')) {
        const text = decodeURIComponent(uri.substring(9));
        
        // Mobile fallback using expo-speech
        if (Platform.OS !== 'web') {
          try {
            const Speech = require('expo-speech');
            console.log('Using native expo-speech for vocal output:', text);
            
            const selectedVoiceName = useAppStore.getState().settings.voice.selectedVoice;
            let selectedVoiceId: string | undefined = undefined;

            if (selectedVoiceName && selectedVoiceName !== 'default') {
              const list = await Speech.getAvailableVoicesAsync();
              const match = list.find((v: any) => v.name === selectedVoiceName);
              if (match) {
                selectedVoiceId = match.identifier;
              }
            }

            if (onPlaybackStatusUpdateCallback) {
              onPlaybackStatusUpdateCallback({
                isLoaded: true,
                isPlaying: true,
                positionMillis: 0,
                durationMillis: text.length * 80,
                didJustFinish: false,
              });
            }

            Speech.speak(text, {
              voice: selectedVoiceId,
              onStart: () => {
                if (onPlaybackStatusUpdateCallback) {
                  onPlaybackStatusUpdateCallback({
                    isLoaded: true,
                    isPlaying: true,
                    positionMillis: 0,
                    durationMillis: text.length * 80,
                    didJustFinish: false,
                  });
                }
              },
              onComplete: () => {
                if (onPlaybackStatusUpdateCallback) {
                  onPlaybackStatusUpdateCallback({
                    isLoaded: true,
                    isPlaying: false,
                    positionMillis: text.length * 80,
                    durationMillis: text.length * 80,
                    didJustFinish: true,
                  });
                }
              },
              onError: (err: any) => {
                console.error('expo-speech error:', err);
                if (onPlaybackStatusUpdateCallback) {
                  onPlaybackStatusUpdateCallback({
                    isLoaded: true,
                    isPlaying: false,
                    positionMillis: 0,
                    durationMillis: 100,
                    didJustFinish: true,
                  });
                }
              }
            });
            return;
          } catch (e) {
            console.warn('Failed to load expo-speech native module', e);
          }
        }

        // Web fallback using browser speech synthesis
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          activeUtterance = utterance;

          utterance.pitch = 1.1;
          utterance.rate = 1.0;
          utterance.volume = 1.0;

          const selectedVoiceName = useAppStore.getState().settings.voice.selectedVoice;
          const voices = window.speechSynthesis.getVoices();
          let selectedVoice = null;

          if (selectedVoiceName && selectedVoiceName !== 'default') {
            selectedVoice = voices.find(v => v.name === selectedVoiceName) || null;
          }

          if (!selectedVoice) {
            const maleNames = ['david', 'ravi', 'george', 'daniel', 'mark', 'richard', 'thomas', 'guy', 'stefan', 'james', 'alex'];
            const preferredVoiceKeywords = [
              'veena', 'heera', 'en-in', 'samantha', 'zira', 'susan', 'karen', 'hazel', 'google us english'
            ];

            const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
            const candidateVoices = englishVoices.filter(v => 
              !maleNames.some(name => v.name.toLowerCase().includes(name))
            );

            for (const keyword of preferredVoiceKeywords) {
              selectedVoice = candidateVoices.find(v => 
                v.name.toLowerCase().includes(keyword) || 
                v.lang.toLowerCase().replace('_', '-').includes(keyword)
              ) || null;
              if (selectedVoice) break;
            }

            if (!selectedVoice && candidateVoices.length > 0) {
              selectedVoice = candidateVoices[0];
            }
          }

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }

          utterance.onstart = () => {
            if (onPlaybackStatusUpdateCallback) {
              onPlaybackStatusUpdateCallback({
                isLoaded: true,
                isPlaying: true,
                positionMillis: 0,
                durationMillis: text.length * 80,
                didJustFinish: false,
              });
            }
          };

          utterance.onend = () => {
            if (onPlaybackStatusUpdateCallback) {
              onPlaybackStatusUpdateCallback({
                isLoaded: true,
                isPlaying: false,
                positionMillis: text.length * 80,
                durationMillis: text.length * 80,
                didJustFinish: true,
              });
            }
            activeUtterance = null;
          };

          utterance.onerror = () => {
            if (onPlaybackStatusUpdateCallback) {
              onPlaybackStatusUpdateCallback({
                isLoaded: true,
                isPlaying: false,
                positionMillis: 0,
                durationMillis: 100,
                didJustFinish: true,
              });
            }
            activeUtterance = null;
          };

          window.speechSynthesis.speak(utterance);
        }
        return;
      }

      // Configure audio session for playback
      if (setAudioModeAsync) {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      }

      // Load and play sound via expo-audio
      if (createAudioPlayer) {
        const player = createAudioPlayer(uri);
        player.volume = 1.0;
        playerInstance = player;

        // Monitor playback progress
        statusInterval = setInterval(() => {
          if (playerInstance && onPlaybackStatusUpdateCallback) {
            const isPlaying = playerInstance.playing;
            const positionMillis = (playerInstance.currentTime || 0) * 1000;
            const durationMillis = (playerInstance.duration || 0) * 1000;
            const isLoaded = playerInstance.isLoaded;
            const didJustFinish = isLoaded && !isPlaying && (positionMillis >= durationMillis - 100);

            onPlaybackStatusUpdateCallback({
              isLoaded,
              isPlaying,
              positionMillis,
              durationMillis,
              didJustFinish,
            });

            if (didJustFinish) {
              clearInterval(statusInterval);
            }
          }
        }, 200);

        player.play();
      } else {
        console.warn('Playback not supported in this environment.');
      }
    } catch (error) {
      console.error('Failed to play audio', error);
      throw error;
    }
  },

  /**
   * Pauses the active audio playback.
   */
  async pause(): Promise<void> {
    try {
      if (playerInstance && typeof playerInstance.pause === 'function') {
        playerInstance.pause();
      }
      // Native expo-speech pause (iOS)
      if (Platform.OS !== 'web') {
        try {
          const Speech = require('expo-speech');
          Speech.pause();
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      console.log('Audio playback paused');
    } catch (error) {
      console.error('Failed to pause playback', error);
      throw error;
    }
  },

  /**
   * Resumes the paused audio playback.
   */
  async resume(): Promise<void> {
    try {
      if (playerInstance && typeof playerInstance.play === 'function') {
        playerInstance.play();
      }
      // Native expo-speech resume (iOS)
      if (Platform.OS !== 'web') {
        try {
          const Speech = require('expo-speech');
          Speech.resume();
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      console.log('Audio playback resumed');
    } catch (error) {
      console.error('Failed to resume playback', error);
      throw error;
    }
  },

  /**
   * Stops the active audio playback and releases resources.
   */
  async stop(): Promise<void> {
    try {
      if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
      }
      if (playerInstance) {
        try {
          playerInstance.pause();
        } catch (e) {}
        playerInstance = null;
      }

      // Stop native speech synthesis
      if (Platform.OS !== 'web') {
        try {
          const Speech = require('expo-speech');
          Speech.stop();
        } catch (e) {}
      }

      // Stop browser speech synthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      activeUtterance = null;
    } catch (error) {
      console.error('Failed to stop playback', error);
    }
  },

  /**
   * Seeks the active audio playback to a specific position in milliseconds.
   */
  async seek(positionMillis: number): Promise<void> {
    if (!playerInstance) return;
    try {
      if (typeof playerInstance.seekTo === 'function') {
        await playerInstance.seekTo(positionMillis / 1000);
      }
      console.log('Audio playback seeked to:', positionMillis);
    } catch (error) {
      console.error('Failed to seek playback', error);
      throw error;
    }
  },

  /**
   * Sets the playback rate/speed.
   */
  async setRate(rate: number): Promise<void> {
    if (!playerInstance) return;
    try {
      playerInstance.playbackRate = rate;
      console.log('Audio playback rate set to:', rate);
    } catch (error) {
      console.error('Failed to set playback rate', error);
      throw error;
    }
  },
};
