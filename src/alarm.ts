// 단계별 반응: 진동 패턴 · 소리 · 배너. 단계가 오를 때 startAlarm, 확인/하강 시 stopAlarm.
import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Level, LEVEL_META } from './level';

// 진동 패턴(ms): [대기, 진동, 대기, 진동, ...]
const PATTERN: Record<Exclude<Level, 'normal'>, number[]> = {
  caution:  [0, 200],
  warning:  [0, 300, 200, 300],
  critical: [0, 600, 300, 600, 300, 600],
};
const CRITICAL_REPEAT_MS = 3000;

let player: AudioPlayer | null = null;
let repeatTimer: ReturnType<typeof setInterval> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function prepareAlarm(): Promise<void> {
  await Notifications.requestPermissionsAsync();
  await setAudioModeAsync({ playsInSilentMode: true });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarm', {
      name: '낙상 위험 알람',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: PATTERN.critical,
      sound: 'default',
    });
  }
  if (!player) player = createAudioPlayer(require('../assets/alarm.wav'));
}

function vibrate(level: Exclude<Level, 'normal'>) {
  Vibration.cancel();
  Vibration.vibrate(PATTERN[level], false);
}

function playSound(loop: boolean) {
  if (!player) return;
  player.loop = loop;
  player.seekTo(0);
  player.play();
}

export async function startAlarm(level: Level, bed = '101'): Promise<void> {
  stopAlarm();
  if (level === 'normal') return;
  const meta = LEVEL_META[level];

  vibrate(level);
  if (level === 'warning') playSound(false);
  if (level === 'critical') {
    playSound(true);
    // iOS는 패턴 반복이 없어 주기적으로 다시 울린다. Android도 동일하게 맞춘다.
    repeatTimer = setInterval(() => vibrate('critical'), CRITICAL_REPEAT_MS);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${bed}호 · ${meta.label}`,
      body: meta.sub,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'alarm' } : {}),
    },
    trigger: null,
  });
}

export function stopAlarm(): void {
  Vibration.cancel();
  if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
  if (player) { player.loop = false; player.pause(); }
}
