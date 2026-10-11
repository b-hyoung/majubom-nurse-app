# 간호사 알람 앱 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MajuBom 서버의 위험 판정을 2초마다 읽어 단계별 진동·소리·배너로 반응하는 Expo 앱 1화면 + 서버 시연 트리거 1개.

**Architecture:** 앱은 판정하지 않고 `deriveLevel(tof, mmw)` 순수 함수로 서버 값 두 개를 단계 하나로 합친 뒤, 단계가 오를 때만 `alarm.ts`가 반응한다. 화면은 `App.tsx` 하나. 서버는 `/demo/alert`로 받은 값을 `/tof/anomaly` 응답의 `demo_level`에 실어 보낸다.

**Tech Stack:** Expo SDK 57, TypeScript, expo-notifications, expo-audio, expo-keep-awake, AsyncStorage, RN Vibration, jest-expo. 서버는 기존 Flask.

---

## 파일 구조
- `src/level.ts` — 타입 `Level`, `deriveLevel()`, `LEVEL_META`(한글명·색·순위). 순수 함수만.
- `src/level.test.ts` — deriveLevel 단위 테스트.
- `src/api.ts` — `fetchStatus(base)`: 세 엔드포인트 병렬 호출, 실패 시 throw. 타임아웃 5초.
- `src/alarm.ts` — `startAlarm(level)`, `stopAlarm()`: 진동 패턴·소리·배너. critical은 반복.
- `src/storage.ts` — 서버 주소 get/set.
- `App.tsx` — 주소 입력 화면 / 대시보드 화면, 폴링 루프, 단계 상승 감지 → alarm 호출.
- `assets/alarm.wav` — 경보음 (합성 생성).
- MajuBom `server/tof_server.py` — `/demo/alert` 추가, `/tof/anomaly`에 `demo_level` 필드.

## Task 1: 프로젝트 생성
- [ ] `npx create-expo-app@latest . --template blank-typescript` (레포 루트, 기존 docs 유지)
- [ ] `npx expo install expo-notifications expo-audio expo-keep-awake @react-native-async-storage/async-storage`
- [ ] `npm i -D jest jest-expo @types/jest` + package.json `"test": "jest"`, `"jest": {"preset": "jest-expo"}`
- [ ] `npx tsc --noEmit` 통과 확인

## Task 2: 단계 판정 (TDD)
- [ ] `src/level.test.ts` 작성: normal/normal→normal, caution→caution, warning→warning, tof anomaly 단독→warning, tof anomaly+caution→critical, critical→critical, demo_level 우선, 결측 필드→normal
- [ ] `npm test` 실패 확인
- [ ] `src/level.ts` 구현
- [ ] `npm test` 통과

## Task 3: api.ts, storage.ts
- [ ] `fetchStatus(base)` — `Promise.all([/tof/anomaly, /mmw/latest, /patients/101])`, AbortController 5초. patients 404는 null로 허용.
- [ ] `getBase()/setBase()` — AsyncStorage 키 `serverBase`.

## Task 4: alarm.ts
- [ ] 진동 패턴: caution `[0,200]`, warning `[0,300,200,300]`, critical `[0,600,300,600,300,600]` 반복(Android는 Vibration repeat, iOS는 setInterval로 재호출).
- [ ] 소리: expo-audio `createAudioPlayer(require('../assets/alarm.wav'))`, warning 1회, critical loop.
- [ ] 배너: `Notifications.scheduleNotificationAsync({content:{title,body,sound:true}, trigger:null})`. 핸들러 shouldShowBanner/List true.
- [ ] `stopAlarm()` — Vibration.cancel, player.pause, interval clear.

## Task 5: App.tsx
- [ ] 첫 실행: 주소 입력 화면(TextInput + 저장). 저장되면 대시보드.
- [ ] 폴링: setInterval 2000ms, fetchStatus → state. 실패 시 `offline=true`.
- [ ] 단계 상승 감지: `rank(new) > rank(prev)` && !acked → startAlarm. 하강 시 stopAlarm + acked=false.
- [ ] 확인 버튼: stopAlarm, ackedAt=now.
- [ ] 화면: 상단 띠(길게 누르면 주소 변경), 상태 카드(critical 점멸 Animated), 세부 2줄, 환자 1줄, 확인 버튼. `.impeccable.md` 원칙 적용.
- [ ] `useKeepAwake()`.

## Task 6: 서버 시연 트리거 (MajuBom)
- [ ] `tof_server.py`: `demo_level = {"level": None}`; `POST /demo/alert` body.level ∈ caution/warning/critical/clear; `GET /tof/anomaly` 응답에 `"demo_level": demo_level["level"]` 추가.
- [ ] curl로 확인: `curl -X POST localhost:5001/demo/alert -H 'Content-Type: application/json' -d '{"level":"critical"}'` → `/tof/anomaly`에 demo_level 반영.

## Task 7: 실행 확인
- [ ] `npx tsc --noEmit`, `npm test` 통과
- [ ] 맥에서 MajuBom `server/tof_server.py` 실행(mmw는 없어도 앱이 normal 처리), `npx expo start` → Expo Go에서 화면 확인, `/demo/alert`로 4단계 전환 확인.
