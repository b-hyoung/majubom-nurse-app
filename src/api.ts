import { MmwLatest, TofAnomaly } from './level';

export interface Patient { name?: string; age?: number; bed_id?: string; risk_summary?: string; risk_factors?: string[] | { name?: string; factor?: string }[]; diagnosis?: string }

export interface Status {
  tof: TofAnomaly | null;
  mmw: MmwLatest | null;
  patient: Patient | null;
  at: number;
}

const TIMEOUT_MS = 5000;
export const BED_ID = '101';

async function getJson<T>(url: string, signal: AbortSignal, optional = false): Promise<T | null> {
  const r = await fetch(url, { signal });
  if (!r.ok) {
    if (optional) return null;
    throw new Error(`${url} → ${r.status}`);
  }
  return (await r.json()) as T;
}

/** /mmw/latest 는 {target_id: result} 형태. 대상이 하나뿐이니 첫 항목을 쓴다. */
function unwrapMmw(raw: Record<string, MmwLatest> | MmwLatest | null): MmwLatest | null {
  if (!raw || typeof raw !== 'object') return null;
  if ('alert_level' in raw) return raw as MmwLatest;
  const first = Object.values(raw as Record<string, MmwLatest>)[0];
  return first ?? null;
}

/** ToF 서버(5001)는 필수. mmWave(5002)와 환자 정보는 없어도 진행. */
export async function fetchStatus(base: string): Promise<Status> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const mmwBase = base.replace(/:5001$/, ':5002');
  try {
    const [tof, mmwRaw, patient] = await Promise.all([
      getJson<TofAnomaly>(`${base}/tof/anomaly`, ctrl.signal),
      getJson<Record<string, MmwLatest> | MmwLatest>(`${mmwBase}/mmw/latest`, ctrl.signal, true).catch(() => null),
      getJson<Patient>(`${base}/patients/${BED_ID}`, ctrl.signal, true).catch(() => null),
    ]);
    return { tof, mmw: unwrapMmw(mmwRaw), patient, at: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

/** 서버 ToF 3D 뷰어를 HUD 없이 (작은 칸용). */
export function tof3dUrl(base: string): string {
  return `${base}/tof/3d?embed=1`;
}
