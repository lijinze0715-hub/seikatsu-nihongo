export function isSpeechSupported() {
  return typeof window !== 'undefined' &&
    'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}
const isNatural = (voice: SpeechSynthesisVoice) => /\bnatural\b/i.test(voice.name);
export function getJapaneseVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices()
    .filter(voice => voice.lang.toLowerCase().startsWith('ja'))
    .sort((a, b) => Number(isNatural(b)) - Number(isNatural(a)) ||
      a.name.localeCompare(b.name, 'ja') || a.voiceURI.localeCompare(b.voiceURI));
}
export function getVoiceLabel(voice: SpeechSynthesisVoice) {
  const name = voice.name.replace(/^Microsoft\s+/i, '')
    .replace(/\s*[-–]\s*Japanese\s*\(Japan\)\s*$/i, '')
    .replace(/\s*\(Natural\)/gi, '').replace(/\bOnline\b/gi, '')
    .replace(/\s+/g, ' ').trim() || voice.name;
  const details = [];
  if (isNatural(voice)) details.push('自然语音');
  if (!voice.localService) details.push('在线');
  // The native API has no gender metadata. Do not infer it from names.
  return name + (details.length ? `（${details.join('・')}）` : '');
}
let currentUtterance: SpeechSynthesisUtterance | null = null;
export function cancelBrowserSpeech() {
  const previous = currentUtterance;
  currentUtterance = null;
  if (previous) { previous.onend = null; previous.onerror = null; }
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
export function playBrowserSpeech(text: string, voice: SpeechSynthesisVoice,
  callbacks: { onend: () => void; onerror: (message: string) => void }) {
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  currentUtterance = utterance;
  utterance.onend = () => {
    if (currentUtterance !== utterance) return;
    currentUtterance = null;
    callbacks.onend();
  };
  const fail = () => {
    if (currentUtterance !== utterance) return;
    currentUtterance = null;
    callbacks.onerror('日语朗读失败。请检查语音是否可用；在线语音还需要可用的网络连接，然后重试。');
  };
  utterance.onerror = fail;
  try { window.speechSynthesis.speak(utterance); }
  catch { fail(); return null; }
  return utterance;
}
