import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'serverBase';

export async function getBase(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEY); } catch { return null; }
}

export async function setBase(base: string): Promise<void> {
  await AsyncStorage.setItem(KEY, base);
}

/** "192.168.6.10" · "192.168.6.10:5001" · "http://..." 모두 허용 → "http://host:5001" */
export function normalizeBase(input: string): string {
  let s = input.trim();
  if (!s) return s;
  if (!/^https?:\/\//.test(s)) s = 'http://' + s;
  const u = new URL(s);
  if (!u.port) u.port = '5001';
  return u.origin;
}
