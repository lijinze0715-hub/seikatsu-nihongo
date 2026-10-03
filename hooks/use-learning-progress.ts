'use client';
import { useEffect, useState } from 'react';
import { createBrowserLearningService } from '@/src/bootstrap/learning';

export function useLearningProgress() {
  const [learning] = useState(createBrowserLearningService);
  const [completed, setCompleted] = useState<string[]>([]);
  const [writable, setWritable] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const result = learning.load();
        setCompleted(result.progress);
        setWritable(result.progressWritable);
        setStorageMessage(result.messages.join(' '));
      } catch {
        setStorageMessage('本机存储不可用，本次进度暂不保存。');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [learning]);

  useEffect(() => {
    if (!writable) return;
    const timer = window.setTimeout(() => {
      try {
        learning.saveProgress(completed);
      } catch {
        setStorageMessage('本机存储不可用，学习进度暂时无法保存。');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [completed, writable, learning]);

  return { completed, setCompleted, storageMessage };
}
