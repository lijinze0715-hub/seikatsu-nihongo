'use client';

import { useSyncExternalStore } from 'react';
import { Volume2 } from 'lucide-react';
import {
  getServerVoiceSnapshot,
  getVoiceLabel,
  getVoiceSnapshot,
  refreshVoicevoxSpeakerList,
  selectJapaneseVoice,
  selectTtsEngine,
  selectVoicevoxStyle,
  subscribeToVoices,
} from '@/lib/japanese-speech';

export function JapaneseVoiceSelector() {
  const state = useSyncExternalStore(
    subscribeToVoices,
    getVoiceSnapshot,
    getServerVoiceSnapshot,
  );
  const browser = state.engine === 'browser';
  return (
    <details className="japanese-voice-settings" id="voice-settings">
      <summary>
        <Volume2 size={16} />
        <span>朗读设置</span>
        <small>选择你喜欢的日语声音</small>
      </summary>
      <div className="japanese-voice-row">
        <label htmlFor="tts-engine">朗读方式</label>
        <select
          id="tts-engine"
          value={state.engine}
          onChange={(event) =>
            selectTtsEngine(
              event.target.value === 'voicevox' ? 'voicevox' : 'browser',
            )
          }
        >
          <option value="browser">浏览器语音</option>
          <option value="voicevox">
            VOICEVOX
            {state.voicevoxStatus === 'unavailable'
              ? '（未连接）'
              : state.voicevoxStatus === 'loading'
                ? '（检测中）'
                : ''}
          </option>
        </select>
        {browser ? (
          <>
            <label htmlFor="japanese-voice">日语语音 / 声优</label>
            <select
              id="japanese-voice"
              value={state.selectedVoiceURI}
              disabled={state.status !== 'ready'}
              aria-describedby="japanese-voice-status"
              onChange={(event) => selectJapaneseVoice(event.target.value)}
            >
              {!state.voices.length && (
                <option value="">
                  {state.status === 'loading'
                    ? '正在加载语音…'
                    : '日语语音不可用'}
                </option>
              )}
              {state.voices.map((voice) => (
                <option
                  key={voice.voiceURI}
                  value={voice.voiceURI}
                  title={voice.name}
                >
                  {getVoiceLabel(voice)}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label htmlFor="voicevox-style">VOICEVOX 角色 / 风格</label>
            <select
              id="voicevox-style"
              value={state.selectedStyleId ?? ''}
              disabled={
                state.voicevoxStatus !== 'connected' ||
                !state.voicevoxStyles.length
              }
              aria-describedby="voicevox-status"
              onChange={(event) =>
                selectVoicevoxStyle(Number(event.target.value))
              }
            >
              {!state.voicevoxStyles.length && (
                <option value="">
                  {state.voicevoxStatus === 'loading'
                    ? '正在加载角色…'
                    : '角色 / 风格不可用'}
                </option>
              )}
              {state.voicevoxStyles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.speakerName} / {style.name}
                </option>
              ))}
            </select>
          </>
        )}
        <span>所有朗读共用当前引擎和语音</span>
      </div>
      <div className="voicevox-connection-row">
        <output id="voicevox-status" aria-live="polite">
          {state.voicevoxStatus === 'unavailable'
            ? 'VOICEVOX 未连接（Engine 未启动或连接受限）'
            : state.voicevoxMessage}
        </output>
        <button
          type="button"
          disabled={state.voicevoxStatus === 'loading'}
          onClick={() => void refreshVoicevoxSpeakerList()}
        >
          重新检测 VOICEVOX
        </button>
      </div>
      <output id="japanese-voice-status" aria-live="polite">
        {[
          ...new Set(
            [
              browser
                ? state.browserMessage
                : state.voicevoxStatus === 'unavailable'
                  ? state.voicevoxMessage
                  : '',
              state.message,
              state.storageMessage,
            ].filter(Boolean),
          ),
        ].join(' ')}
      </output>
    </details>
  );
}
