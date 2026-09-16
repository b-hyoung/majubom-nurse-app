# 마주봄 간호사 알람 앱 — 설계 (2026-09-16)

## 목적
시연 영상용. 어르신이 침대에서 나오려 할 때 간호사 폰에 단계별로 다른 진동·소리 알람이 오는 장면을 보여준다.
앱은 판정하지 않는다. MajuBom 서버가 이미 계산한 위험 값을 읽고 **반응만** 한다.

## 결정 사항 (브레인스토밍 결과)
- 대상 폰: 아이폰 + 안드로이드 둘 다 → Expo Go 한 코드베이스.
- 알람 발생: 실제 센서 판정(기본) + 시연용 트리거(백업) 둘 다.
- 폰 상태: 앱을 켜둔 상태로 시연. 화면 유지(keep-awake). 잠금화면·백그라운드 알림은 범위 밖
  (Expo Go는 백그라운드 실행 미지원, 안드로이드 Expo Go는 SDK 53+ 원격 푸시 미지원 — 2026-09 확인).
- 화면: 병상 1개(101호) 카드 하나. 병상 목록·이력 탭 없음.
- 코드 위치: 별도 레포 `majubom-nurse-app`.

## 구조
1. **서버 (MajuBom, 라즈베리파이)** — 수정 1건. ToF 서버(5001)에 `POST /demo/alert` 추가.
   body `{"level": "caution" | "warning" | "critical" | "clear"}`. 메모리에 저장.
   `/tof/anomaly`·`/mmw/latest` 응답에 `demo_level` 필드로 실어 보내고, 앱은 이 값이 있으면 실제 판정보다 우선.
   `clear`면 실제 판정으로 복귀. 트리거는 `curl` 또는 기존 대시보드의 버튼 3개.
2. **앱 (Expo + React Native + TypeScript)** — 화면 1개. 2초마다 `/tof/anomaly`, `/mmw/latest`, `/patients/101` 폴링.
3. **연결** — 같은 와이파이. 첫 실행 때 서버 주소 입력 → AsyncStorage 저장. 상단 띠 길게 누르면 변경.

## 단계 판정 (앱 내부, 순수 함수 `deriveLevel(tof, mmw)`)
"둘 중 높은 쪽" 규칙.

| 앱 단계 | 서버 조건 | 폰 반응 |
|---|---|---|
| normal | mmWave normal, ToF normal | 초록. 조용 |
| caution | mmWave caution | 노랑. 짧은 진동 1회 |
| warning | mmWave warning **또는** ToF anomaly | 주황. 진동 2회 + 알림음 1회 |
| critical | mmWave critical **또는** (ToF anomaly **그리고** mmWave caution 이상) | 빨강, 화면 점멸. 긴 진동 3회 반복 + 경보음, 확인 전까지 반복 |

`demo_level`이 있으면 그 값을 그대로 앱 단계로 사용.

### 알람 규칙
- 단계가 **올라갈 때만** 1회 발생. 같은 단계 유지 시 재발생 없음. critical만 확인 전까지 반복.
- **확인** 버튼: 소리·진동 정지, 카드에 "확인 HH:MM" 표시. 단계가 내려가면 자동으로 정상 표시.
- 서버 응답 5초 이상 없음 → 상단 띠 회색 "서버 연결 끊김".

## 화면 (위→아래)
1. 상단 띠: "마주봄 · 101호" + 마지막 갱신 시각. 연결 끊김 시 회색 안내.
2. 상태 카드(화면 절반): 단계 이름 크게, 배경 = 단계 색. critical은 느린 점멸.
3. 세부 2줄: 자세(ToF), 보행 위험도(mmWave z-score 합계 + 단계).
4. 환자 1줄: 이름·나이·위험인자 요약 (`/patients/101`).
5. 확인 버튼: 알람 중일 때만 활성.
첫 실행: 서버 주소 입력 화면 → 저장 후 대시보드.

## 기술
- Expo SDK 최신 안정판, TypeScript. 상태관리·화면 라이브러리 없음.
- 파일: `App.tsx`(화면), `src/api.ts`(호출 + `deriveLevel`), `src/alarm.ts`(진동·소리·배너), `src/storage.ts`(주소 저장).
- 패키지: expo-notifications(배너), Vibration(RN 기본, 패턴 진동), expo-av(경보음 mp3 1개 번들), expo-keep-awake, @react-native-async-storage/async-storage.
- 실행: `npx expo start` → Expo Go로 QR.

## 테스트
- `deriveLevel` 단위 테스트(jest): 서버 응답 조합 → 단계. demo_level 우선 케이스 포함.
- 진동·소리·화면·연결 끊김은 실기기에서 수동 확인.

## 범위 밖
잠금화면/백그라운드 알림, 원격 푸시, 다중 병상, 알림 이력, 로그인.
