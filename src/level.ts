// 서버 판정 두 개 → 앱 단계 하나. 순수 함수만. 앱은 판정하지 않고 "둘 중 높은 쪽"만 고른다.

export type Level = 'normal' | 'caution' | 'warning' | 'critical';

export const LEVELS: Level[] = ['normal', 'caution', 'warning', 'critical'];

export function rank(level: Level): number {
  return LEVELS.indexOf(level);
}

export const LEVEL_META: Record<Level, { label: string; sub: string; color: string; soft: string; ink: string }> = {
  normal:   { label: '정상', sub: '평소와 같습니다',           color: '#2E7D5B', soft: '#E4F1EA', ink: '#1F5A42' },
  caution:  { label: '주의', sub: '평소보다 걸음이 불안정합니다', color: '#C98A12', soft: '#FBEFD2', ink: '#7A5208' },
  warning:  { label: '경고', sub: '침대 가장자리로 이동 중',       color: '#D9631E', soft: '#FBE3D3', ink: '#8A3D0E' },
  critical: { label: '위험', sub: '지금 나오려 합니다 · 즉시 확인', color: '#C8302F', soft: '#F8DADA', ink: '#FFFFFF' },
};

export interface DemoState { level?: string | null; posture?: string | null; note?: string | null; morning_risk?: string | null; patient?: string | null }
export interface TofAnomaly { status?: string | null; demo_level?: string | null; demo?: DemoState | null; posture?: string | null; ratio?: number | null; reason?: string | null; at?: string | null }
export interface MmwLatest { alert_level?: string | null; zscore?: { total_abs?: number | null } | null; total_abs?: number | null; alarm?: boolean; alarm_urgent?: boolean }

function asLevel(v: unknown): Level | null {
  return typeof v === 'string' && (LEVELS as string[]).includes(v) ? (v as Level) : null;
}

export function deriveLevel(tof: TofAnomaly | null | undefined, mmw: MmwLatest | null | undefined): Level {
  // 시연 트리거가 있으면 그대로. 'clear'나 미지 값은 무시.
  const demo = asLevel(tof?.demo_level);
  if (demo) return demo;

  const gait = asLevel(mmw?.alert_level) ?? 'normal';
  const exiting = tof?.status === 'anomaly';

  if (gait === 'critical') return 'critical';
  if (exiting && rank(gait) >= rank('caution')) return 'critical';
  if (exiting) return 'warning';
  return gait;
}
