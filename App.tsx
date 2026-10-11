import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { fetchStatus, Status, BED_ID } from './src/api';
import { deriveLevel, Level, LEVEL_META, rank } from './src/level';
import { prepareAlarm, startAlarm, stopAlarm } from './src/alarm';
import { getBase, normalizeBase, setBase } from './src/storage';
import { Tof3D } from './src/Tof3D';

const POLL_MS = 500;
const OFFLINE_AFTER_MS = 5000;

// 디자인 토큰 (.impeccable.md) — 라이트 고정, 냉색 회백 바탕, 상태색은 카드에만
const T = {
  bg: '#F2F5F7', paper: '#FFFFFF', ink: '#182028', ink2: '#5A6573', ink3: '#8A94A0', line: '#DCE2E8',
  accent: '#3C6FD1', accentSoft: '#E6EDFA', offline: '#8A94A0',
};

const POSTURE_KO: Record<string, string> = {
  supine: '정자세', lying: '누움', side: '측와위', left: '좌측와위', right: '우측와위',
  sitting: '앉음', sit: '앉음', edge: '걸터앉음', edge_sit: '걸터앉음', empty: '빈 침대', out: '이탈',
};

export default function App() {
  useKeepAwake();
  const [base, setBaseState] = useState<string | null | undefined>(undefined);
  useEffect(() => { getBase().then(b => setBaseState(b)); }, []);

  if (base === undefined) return <SafeAreaView style={s.root} />;
  if (!base) return <Setup onSave={b => { setBase(b); setBaseState(b); }} />;
  return <Dashboard base={base} onChangeBase={() => setBaseState(null)} />;
}

function Setup({ onSave }: { onSave: (base: string) => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    try { onSave(normalizeBase(text)); } catch { setErr('주소 형식을 확인해 주세요. 예: 192.168.6.10'); }
  };
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" />
      <View style={s.setup}>
        <Text style={s.eyebrow}>마주봄 · 간호사</Text>
        <Text style={s.setupTitle}>서버 주소</Text>
        <Text style={s.setupHelp}>라즈베리파이의 IP를 넣어 주세요. 같은 와이파이여야 합니다.</Text>
        <TextInput
          value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false}
          keyboardType="url" style={s.input} placeholder="예: 192.168.0.9" placeholderTextColor={T.ink3}
          onSubmitEditing={save} returnKeyType="done"
        />
        {err && <Text style={s.err}>{err}</Text>}
        <Pressable onPress={save} style={({ pressed }) => [s.btnPrimary, pressed && { opacity: .85 }]}>
          <Text style={s.btnPrimaryText}>연결</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Dashboard({ base, onChangeBase }: { base: string; onChangeBase: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [lastOk, setLastOk] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const [level, setLevel] = useState<Level>('normal');
  const [alarming, setAlarming] = useState(false);
  const [ackedAt, setAckedAt] = useState<number | null>(null);
  const prevLevel = useRef<Level>('normal');
  const acked = useRef(false);

  useEffect(() => { prepareAlarm().catch(() => {}); return () => stopAlarm(); }, []);

  // 폴링
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const st = await fetchStatus(base);
        if (!alive) return;
        setStatus(st); setLastOk(st.at);
      } catch { /* offline은 lastOk 경과로 판단 */ }
      setNow(Date.now());
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [base]);

  // 단계 변화 → 알람
  useEffect(() => {
    if (!status) return;
    const next = deriveLevel(status.tof, status.mmw);
    const prev = prevLevel.current;
    if (next !== prev) {
      if (rank(next) > rank(prev)) {
        acked.current = false; setAckedAt(null);
        startAlarm(next, BED_ID).catch(() => {});
        setAlarming(true);
      } else {
        stopAlarm(); setAlarming(false);
        if (next === 'normal') { acked.current = false; setAckedAt(null); }
      }
      prevLevel.current = next;
      setLevel(next);
    }
  }, [status]);

  const ack = useCallback(() => {
    stopAlarm(); acked.current = true; setAlarming(false); setAckedAt(Date.now());
  }, []);

  const offline = lastOk === 0 ? now - 0 > OFFLINE_AFTER_MS && status === null : now - lastOk > OFFLINE_AFTER_MS;
  const meta = LEVEL_META[level];

  // 위험 단계 점멸
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (level === 'critical' && alarming) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]));
      loop.start();
      return () => { loop.stop(); pulse.setValue(0); };
    }
    pulse.setValue(0);
  }, [level, alarming, pulse]);

  const cardBg = level === 'normal' ? T.paper
    : level === 'critical' ? pulse.interpolate({ inputRange: [0, 1], outputRange: [meta.color, '#8E1F1F'] })
    : meta.color;
  const cardInk = level === 'normal' ? T.ink : '#FFFFFF';
  const cardSub = level === 'normal' ? T.ink2 : 'rgba(255,255,255,.85)';

  const demo = status?.tof?.demo ?? null;
  const posture = demo?.posture ?? (status?.tof?.posture ? (POSTURE_KO[status.tof.posture] ?? status.tof.posture) : '—');
  const note = demo?.note ?? status?.tof?.reason ?? undefined;
  const morning = demo?.morning_risk && (LEVEL_META as any)[demo.morning_risk] ? LEVEL_META[demo.morning_risk as Level] : null;
  const cardSubText = level === 'critical' && demo?.note ? demo.note : level === 'normal' && demo?.posture ? demo.posture : meta.sub;
  const z = status?.mmw?.zscore?.total_abs ?? status?.mmw?.total_abs;
  const gait = status?.mmw?.alert_level ? LEVEL_META[deriveLevel(null, { alert_level: status.mmw.alert_level })].label : '—';
  const p = status?.patient;
  const who = demo?.patient ?? (p?.name ? `${p.name}${p.age ? ` · ${p.age}세` : ''}` : null);
  const risk = p?.risk_summary ?? (Array.isArray(p?.risk_factors) ? p!.risk_factors!.map((r: any) => typeof r === 'string' ? r : r.name ?? r.factor).filter(Boolean).join(' · ') : null);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" />
      {/* 상단 띠 */}
      <Pressable onLongPress={onChangeBase} delayLongPress={600} style={[s.bar, offline && s.barOffline]}>
        <Text style={[s.barTitle, offline && s.barTextOffline]} numberOfLines={1}>{who ? `${who} · ${BED_ID}호` : `${BED_ID}호`}</Text>
        <Text style={[s.barMeta, offline && s.barTextOffline]}>
          {offline ? `${base.replace('http://', '')} · 연결 끊김` : lastOk ? `갱신 ${fmtTime(lastOk)}` : `${base.replace('http://', '')} 연결 중…`}
        </Text>
      </Pressable>

      {/* 오늘 아침 위험도 (낮 보행 분석) */}
      {morning && (
        <View style={[s.morning, { borderColor: morning.color }]}>
          <View style={[s.morningDot, { backgroundColor: morning.color }]} />
          <Text style={s.morningK}>오늘 아침 낙상 위험도</Text>
          <Text style={[s.morningV, { color: morning.color }]}>{morning.label}</Text>
          <Text style={s.morningNote}>낮 보행 분석</Text>
        </View>
      )}

      {/* 상태 카드 */}
      <Animated.View style={[s.card, { backgroundColor: cardBg }, level === 'normal' && s.cardNormal]}>
        {level === 'normal' && <View style={[s.dot, { backgroundColor: meta.color }]} />}
        <Text style={[s.levelLabel, { color: cardInk }]}>{meta.label}</Text>
        <Text style={[s.levelSub, { color: cardSub }]}>{cardSubText}</Text>
        {ackedAt && level !== 'normal' && (
          <Text style={[s.acked, { color: cardSub }]}>확인 {fmtTime(ackedAt)}</Text>
        )}
      </Animated.View>

      {/* ToF 3D 자세 (서버 대시보드와 같은 뷰) */}
      <Tof3D base={base} offline={offline} />

      {/* 세부 */}
      <View style={s.rows}>
        <Row k="자세" v={posture} note={note} />
        <Row k="보행 위험도" v={gait} note={typeof z === 'number' ? `평소 대비 z ${z.toFixed(1)}` : undefined} />
        <Row k="환자" v={who ?? '정보 없음'} note={risk ?? p?.diagnosis ?? (demo?.morning_risk ? '치매 · 낙상 이력 · 낮 보행 불안정' : undefined)} />
      </View>

      {/* 확인 */}
      <View style={s.footer}>
        {alarming && (
          <Pressable onPress={ack} style={({ pressed }) => [s.ackBtn, pressed && { opacity: .85 }]}>
            <Text style={s.ackText}>확인</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function Row({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowK}>{k}</Text>
      <View style={s.rowV}>
        <Text style={s.rowVal} numberOfLines={1}>{v}</Text>
        {note ? <Text style={s.rowNote} numberOfLines={2}>{note}</Text> : null}
      </View>
    </View>
  );
}

function fmtTime(t: number) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  // setup
  setup: { flex: 1, justifyContent: 'center', padding: 28, gap: 10 },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 1, color: T.accent, textTransform: 'uppercase' },
  setupTitle: { fontSize: 30, fontWeight: '800', color: T.ink, letterSpacing: -0.5 },
  setupHelp: { fontSize: 15, color: T.ink2, marginBottom: 12 },
  input: { height: 56, borderRadius: 12, borderWidth: 1, borderColor: T.line, backgroundColor: T.paper, paddingHorizontal: 16, fontSize: 18, color: T.ink, fontVariant: ['tabular-nums'] },
  err: { color: '#C8302F', fontSize: 14 },
  btnPrimary: { height: 56, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  // bar
  bar: { height: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: T.line, backgroundColor: T.bg },
  barOffline: { backgroundColor: T.offline, borderBottomColor: T.offline },
  barTitle: { fontSize: 15, fontWeight: '700', color: T.ink },
  barMeta: { fontSize: 13, color: T.ink3, fontVariant: ['tabular-nums'] },
  barTextOffline: { color: '#FFFFFF' },
  // morning risk
  morning: { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, backgroundColor: T.paper },
  morningDot: { width: 8, height: 8, borderRadius: 4 },
  morningK: { fontSize: 14, color: T.ink2, flex: 1 },
  morningV: { fontSize: 17, fontWeight: '800' },
  morningNote: { fontSize: 12, color: T.ink3 },
  // card
  card: { flex: 1, margin: 16, marginBottom: 8, borderRadius: 20, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 8 },
  cardNormal: { borderWidth: 1, borderColor: T.line },
  dot: { width: 12, height: 12, borderRadius: 6, marginBottom: 10 },
  levelLabel: { fontSize: 64, fontWeight: '800', letterSpacing: -1.5, lineHeight: 72 },
  levelSub: { fontSize: 18, fontWeight: '500', textAlign: 'center' },
  acked: { fontSize: 14, marginTop: 6, fontVariant: ['tabular-nums'] },
  // rows
  rows: { marginHorizontal: 16, backgroundColor: T.paper, borderRadius: 16, borderWidth: 1, borderColor: T.line, paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.line },
  rowK: { width: 84, fontSize: 14, color: T.ink3, paddingTop: 2 },
  rowV: { flex: 1 },
  rowVal: { fontSize: 17, fontWeight: '600', color: T.ink, fontVariant: ['tabular-nums'] },
  rowNote: { fontSize: 13, color: T.ink2, marginTop: 2 },
  // footer
  footer: { padding: 16, paddingTop: 12, minHeight: 88 },
  ackBtn: { height: 60, borderRadius: 14, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center' },
  ackText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
});
