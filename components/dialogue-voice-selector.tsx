'use client';
import { useSyncExternalStore } from 'react';
import { getServerVoiceSnapshot, getVoiceLabel, getVoiceSnapshot, subscribeToVoices } from '@/lib/japanese-speech';
import { dialogueRoleKey, getDialogueRoles, getDialogueVoiceSnapshot, getServerDialogueVoiceSnapshot,
  isSelfDialogueRole, setDialogueVoice, subscribeToDialogueVoices } from '@/lib/dialogue-voices';

export function DialogueVoiceSelector({ lessonId, roles }: { lessonId: string; roles: string[] }) {
  const tts = useSyncExternalStore(subscribeToVoices, getVoiceSnapshot, getServerVoiceSnapshot);
  const config = useSyncExternalStore(subscribeToDialogueVoices, getDialogueVoiceSnapshot, getServerDialogueVoiceSnapshot);
  const browser = tts.engine === 'browser';
  const available = browser ? tts.status === 'ready' : tts.voicevoxStatus === 'connected' && tts.voicevoxStyles.length > 0;
  return <fieldset className="n5-dialogue-voices">
    <legend>对话角色声优</legend>
    <p>使用{browser ? '浏览器语音' : 'VOICEVOX'}。“我”的声音跨课共用，其他角色的声音保存在本课；逐句和连续播放都按角色朗读。</p>
    <div className="n5-dialogue-voice-grid">{getDialogueRoles(roles).map(role => {
      const key = dialogueRoleKey(lessonId, role);
      const choice = config.choices[key] ?? {};
      const saved = browser ? choice.voiceURI : choice.styleId;
      const exists = browser ? tts.voices.some(voice => voice.voiceURI === saved) : tts.voicevoxStyles.some(style => style.id === saved);
      const id = `dialogue-voice-${encodeURIComponent(key)}`;
      return <div className="n5-dialogue-voice-field" key={key}>
        <label htmlFor={id}>{isSelfDialogueRole(role) ? '我（所有课程共用）' : role}</label>
        <select id={id} disabled={!available} value={exists ? String(saved) : ''}
          onChange={event => setDialogueVoice(lessonId, role, tts.engine, event.target.value)}>
          <option value="">{available ? '使用页面顶部默认声音' : '当前引擎语音不可用'}</option>
          {browser ? tts.voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{getVoiceLabel(voice)}</option>)
            : tts.voicevoxStyles.map(style => <option key={style.id} value={style.id}>{style.speakerName} / {style.name}</option>)}
        </select>
        {available && saved !== undefined && !exists && <small>已保存的声音当前不可用，朗读将使用顶部默认声音。</small>}
      </div>;
    })}</div>
    {!available && <output>{browser ? tts.browserMessage : tts.voicevoxMessage}</output>}
    {config.message && <output>{config.message}</output>}
  </fieldset>;
}
