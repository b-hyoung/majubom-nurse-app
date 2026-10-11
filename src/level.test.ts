import { deriveLevel, rank, Level } from './level';

const tof = (status: 'normal' | 'anomaly', demo_level: string | null = null) => ({ status, demo_level });
const mmw = (alert_level: string | null) => ({ alert_level });

describe('deriveLevel', () => {
  test('둘 다 정상이면 normal', () => {
    expect(deriveLevel(tof('normal'), mmw('normal'))).toBe<Level>('normal');
  });
  test('mmWave caution → caution', () => {
    expect(deriveLevel(tof('normal'), mmw('caution'))).toBe('caution');
  });
  test('mmWave warning → warning', () => {
    expect(deriveLevel(tof('normal'), mmw('warning'))).toBe('warning');
  });
  test('ToF anomaly 단독 → warning', () => {
    expect(deriveLevel(tof('anomaly'), mmw('normal'))).toBe('warning');
  });
  test('ToF anomaly + mmWave caution 이상 → critical', () => {
    expect(deriveLevel(tof('anomaly'), mmw('caution'))).toBe('critical');
    expect(deriveLevel(tof('anomaly'), mmw('warning'))).toBe('critical');
  });
  test('mmWave critical → critical', () => {
    expect(deriveLevel(tof('normal'), mmw('critical'))).toBe('critical');
  });
  test('demo_level이 있으면 실제 판정보다 우선', () => {
    expect(deriveLevel(tof('anomaly', 'caution'), mmw('critical'))).toBe('caution');
    expect(deriveLevel(tof('normal', 'critical'), mmw('normal'))).toBe('critical');
  });
  test('결측·null 응답은 normal', () => {
    expect(deriveLevel(null, null)).toBe('normal');
    expect(deriveLevel(tof('normal'), null)).toBe('normal');
    expect(deriveLevel(null, mmw(null))).toBe('normal');
  });
  test('알 수 없는 문자열은 normal 취급', () => {
    expect(deriveLevel(tof('normal'), mmw('weird'))).toBe('normal');
  });
});

describe('rank', () => {
  test('단계 순서', () => {
    expect(rank('normal')).toBeLessThan(rank('caution'));
    expect(rank('caution')).toBeLessThan(rank('warning'));
    expect(rank('warning')).toBeLessThan(rank('critical'));
  });
});
