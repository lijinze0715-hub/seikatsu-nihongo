'use client';
import { useEffect, useRef, useState } from 'react';
import { cancelJapaneseSpeech, speakJapanese } from '@/lib/japanese-speech';
import type { TtsVoiceSelection } from '@/lib/japanese-speech';

export type SpeechItem = string | { text: string; voice?: () => TtsVoiceSelection };

const hasJapanese = (text: string) => /[ぁ-ゖァ-ヺ一-龯々]/.test(text);
const toSpeechText = (text: string) => {
  const parts = text.split(/[：:]/).map(part => part.trim()).filter(Boolean);
  return [...parts].reverse().find(hasJapanese) ?? text;
};

export function useJapaneseSpeech() {
  const [speechKey, setSpeechKey] = useState<string | null>(null);
  const [speechMessage, setSpeechMessage] = useState('');
  const activeKeyRef = useRef<string | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => () => {
    tokenRef.current += 1;
    cancelJapaneseSpeech();
  }, []);

  const stopSpeech = () => {
    tokenRef.current += 1;
    activeKeyRef.current = null;
    cancelJapaneseSpeech();
    setSpeechKey(null);
    setSpeechMessage('');
  };

  const play = (items: SpeechItem[], key: string) => {
    if (activeKeyRef.current === key) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const queue = items.map(item => typeof item === 'string'
      ? { text: toSpeechText(item), voice: undefined }
      : { ...item, text: toSpeechText(item.text) })
      .filter(item => hasJapanese(item.text) || /[0-9０-９]/.test(item.text));
    if (!queue.length) {
      setSpeechMessage('这一项没有可朗读的日语文本。');
      return;
    }
    const token = ++tokenRef.current;
    activeKeyRef.current = key;
    const speakAt = (index: number) => {
      if (tokenRef.current !== token) return;
      if (index >= queue.length) {
        activeKeyRef.current = null;
        setSpeechKey(null);
        return;
      }
      setSpeechKey(queue.length > 1 ? `${key}:${index}` : key);
      void speakJapanese(queue[index].text, {
        oncancel: () => {
          if (tokenRef.current !== token) return;
          tokenRef.current += 1;
          activeKeyRef.current = null;
          setSpeechKey(null);
          setSpeechMessage('');
        },
        onend: () => {
          if (tokenRef.current === token) speakAt(index + 1);
        },
        onerror: message => {
          if (tokenRef.current !== token) return;
          activeKeyRef.current = null;
          setSpeechKey(null);
          setSpeechMessage(message);
        },
      }, queue[index].voice?.());
    };
    speakAt(0);
  };

  return { speechKey, speechMessage, stopSpeech, play };
}
