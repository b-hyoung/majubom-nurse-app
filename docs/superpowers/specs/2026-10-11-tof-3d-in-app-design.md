# 앱 안에 ToF 3D 자세 보기 — 설계

## 목표
간호사가 알람 화면 한 장에서 위험 단계와 어르신의 실제 자세(웹 대시보드의 ToF 3D)를 함께 본다.

## 방식
서버의 기존 3D 뷰어(`/tof/3d`)를 앱의 WebView로 띄운다. 작은 칸에 맞게 서버 페이지에 `?embed=1` 모드를 추가한다.

## 서버 — `MajuBom/server/tof_3d.html`
- `?embed=1`이면 `#top`, `#status`, `#panelToggle`, `#panel`, `#coord`, `#help`, `#legend`를 숨긴다.
- 남는 것: 3D 캔버스, 우상단 자세 라벨 `#state`.
- 파라미터 없으면 기존과 동일. Python 코드 변경 없음.

## 앱 — `majubom-nurse-app`
- 의존성: `react-native-webview` (Expo Go 지원).
- `src/Tof3D.tsx`: `{base}/tof/3d?embed=1`을 띄우는 WebView 칸. 터치 조작 비활성(`pointerEvents="none"`). 좌상단 "ToF 3D" 라벨.
- `offline`이면 회색 덮개 + "3D 연결 끊김". 판정은 기존 상단 띠의 `offline` 값을 그대로 받는다.
- 배치: 상단 띠 → 아침 위험도 → 단계 카드(flex 유지, 3D 칸만큼 줄어듦) → 3D 칸(높이 220) → 세부 3행 → 확인 버튼.
- 알람·점멸·폴링 로직은 변경 없음.

## 범위 밖
3D 회전·줌 조작, 센서 설정 변경, 대시보드 전체 탭.

## 확인
- `npm test`, `npx tsc --noEmit` 통과.
- 웹 실행 + 가짜 서버(3D 페이지 포함)로 정상·위험 단계 스크린샷에서 3D 칸이 보이는지 확인.
- 커밋: 앱 저장소 / MajuBom 저장소(`tof_3d.html`만) 각각 push.
