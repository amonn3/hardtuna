export type Language = 'en' | 'pt-BR';

export const en = {
  appTitle: 'HardTuna — Guitar Tuner',
  description: 'Tune your guitar in your browser. Standard tuning, locally processed microphone audio, and an adjustable A4 reference.',
  subtitle: 'Guitar tuner', standardTuning: 'Standard tuning', standard: 'Standard',
  language: 'Language', ready: 'Ready to tune', activateHint: 'Enable the microphone to get started',
  calibrating: 'Measuring background noise', silence: 'Stay quiet for a second',
  clipping: 'Signal clipping', moveAway: 'Move the instrument away from the microphone',
  unclear: 'Unclear sound', reduceNoise: 'Play just one string and reduce background noise',
  distant: 'Note outside the string range', selectManual: 'Select a string in manual mode to check',
  previous: 'Previous reading', play: 'Play a string', manualMode: 'Manual mode',
  automatic: 'The string is detected automatically', tuned: 'In tune!', next: 'Great! Move on to the next string',
  tighten: 'Tighten the string', checkString: 'Check the selected string and adjust gradually',
  flat: 'Too low (♭) — raise the pitch', loosen: 'Loosen the string', sharp: 'Too high (♯) — lower the pitch',
  hearing: 'hearing', waiting: 'waiting for sound', strings: 'Strings', string: 'String', tunedString: 'in tune',
  mode: 'Mode', auto: 'Auto', manual: 'Manual', reference: 'Reference frequency',
  decreaseA4: 'Decrease A4', increaseA4: 'Increase A4', micLevel: 'Microphone level',
  stopMic: 'Turn off microphone', sensitivity: 'Sensitivity', calibrate: 'Calibrate noise', reset: 'Reset tuning',
  startTitle: 'Let’s tune your guitar',
  privacy: 'HardTuna needs to hear your instrument. Audio is processed locally in your browser and never leaves your device.',
  permission: 'Waiting for permission…', activate: 'Enable microphone', cancel: 'Cancel',
  tip: 'Tip: play one string at a time and let it ring. Tolerance:', by: 'by',
  denied: 'Microphone permission denied. Allow access in your browser settings and try again.',
  notFound: 'No microphone found. Connect a microphone and try again.',
  notReadable: 'The microphone is being used by another application.',
  micError: 'Unable to access the microphone.',
  unsupported: 'This browser does not support audio capture (HTTPS or localhost is required).',
  interrupted: 'Capture interrupted. Enable the microphone again to reconnect.',
  hidden: 'Capture paused while the tab was hidden. Enable the microphone to continue.',
};
export type Messages = typeof en;
export const ptBR: Messages = {
  appTitle: 'HardTuna — Afinador de Violão',
  description: 'Afine seu violão pelo navegador. Afinação padrão, microfone processado localmente e referência A4 ajustável.',
  subtitle: 'Afinador de violão', standardTuning: 'Afinação padrão', standard: 'Padrão',
  language: 'Idioma', ready: 'Pronto para afinar', activateHint: 'Ative o microfone para começar',
  calibrating: 'Medindo ruído ambiente', silence: 'Aguarde um segundo em silêncio',
  clipping: 'Sinal saturado', moveAway: 'Afaste o instrumento do microfone',
  unclear: 'Som pouco definido', reduceNoise: 'Toque apenas uma corda e reduza o ruído ao redor',
  distant: 'Nota distante das cordas', selectManual: 'Selecione a corda no modo manual para conferir',
  previous: 'Leitura anterior', play: 'Toque uma corda', manualMode: 'Modo manual',
  automatic: 'A corda é detectada automaticamente', tuned: 'Afinado!', next: 'Perfeito, pode passar para a próxima corda',
  tighten: 'Aperte a corda', checkString: 'Confira a corda selecionada e ajuste aos poucos',
  flat: 'Está baixo (♭) — suba a afinação', loosen: 'Afrouxe a corda', sharp: 'Está alto (♯) — desça a afinação',
  hearing: 'ouvindo', waiting: 'aguardando som', strings: 'Cordas', string: 'Corda', tunedString: 'afinada',
  mode: 'Modo', auto: 'Auto', manual: 'Manual', reference: 'Frequência de referência',
  decreaseA4: 'Diminuir A4', increaseA4: 'Aumentar A4', micLevel: 'Nível do microfone',
  stopMic: 'Desligar microfone', sensitivity: 'Sensibilidade', calibrate: 'Calibrar ruído', reset: 'Reiniciar afinação',
  startTitle: 'Vamos afinar seu violão',
  privacy: 'O HardTuna precisa ouvir seu instrumento. O áudio é processado localmente no seu navegador e nunca sai do seu dispositivo.',
  permission: 'Aguardando permissão…', activate: 'Ativar microfone', cancel: 'Cancelar',
  tip: 'Dica: toque uma corda de cada vez, deixando-a soar livre. Tolerância:', by: 'por',
  denied: 'Permissão do microfone negada. Libere o acesso nas configurações do navegador e tente novamente.',
  notFound: 'Nenhum microfone encontrado. Conecte um microfone e tente novamente.',
  notReadable: 'O microfone está sendo usado por outro aplicativo.',
  micError: 'Não foi possível acessar o microfone.',
  unsupported: 'Este navegador não suporta captura de áudio (é necessário HTTPS ou localhost).',
  interrupted: 'Captura interrompida. Ative o microfone novamente para reconectar.',
  hidden: 'Captura pausada com a aba oculta. Ative o microfone para continuar.',
};
export const messages: Record<Language, Messages> = { en, 'pt-BR': ptBR };
export type MicrophoneError = 'denied' | 'notFound' | 'notReadable' | 'micError' | 'unsupported' | 'interrupted' | 'hidden';

export function readLanguage(): Language {
  try { return localStorage.getItem('hardtuna:language') === 'pt-BR' ? 'pt-BR' : 'en'; }
  catch { return 'en'; }
}
export function saveLanguage(language: Language) {
  try { localStorage.setItem('hardtuna:language', language); } catch { /* Storage is optional. */ }
}
