# NOOS Mobile

> AI 음악·조명 오브제 NOOS의 React Native 모바일 앱

NOOS Mobile은 사용자의 현재 상태를 설문과 Muse EEG 측정으로 기록하고, 상태에 맞는 행성 테마 기반 음악·조명 세션을 제공하는 모바일 앱입니다. Expo Dev Client 기반으로 iOS/Android 네이티브 기능과 백엔드 API 연동을 함께 다룹니다.

## 프로젝트 개요

| 항목 | 내용 |
|:---|:---|
| 프로젝트 | NOOS - AI 음악·조명 오브제 |
| 저장소 역할 | React Native 모바일 앱 |
| 주요 기능 | 로그인, 상태 측정, Muse 연결, AI 세션, 기록, 설정 |
| 백엔드 | Spring Boot API 서버 |

## 담당 역할

- Expo Dev Client 기반 모바일 앱 구조 구성
- 인증, 온보딩, 측정, 여정, 기록, 설정 화면 플로우 구현
- Muse BLE 연결, EEG 측정, FFT 기반 밴드 계산 로직 구성
- 상태 설문, 측정 결과, 행성 선택, AI 음악·조명 세션 화면 구현
- React Query, Zustand 기반 API 요청과 상태 관리 분리
- mock gateway를 통한 백엔드 미연결 상태의 화면 검증 흐름 구성

## 주요 기능

- **Auth**: 로그인, 회원가입, 인증 상태 관리
- **Measure**: 수동 상태 입력, Muse 연결, EEG 측정, 측정 결과 확인
- **Journey**: 행성 선택, 세션 생성 대기, 음악 재생, 피드백, 요약
- **Adaptive Session**: 사용자 상태에 따른 적응형 세션 설정·재생·요약
- **History**: 이전 측정/세션 기록 목록과 상세 조회
- **Settings**: 백엔드 URL, 계정, 디버그 설정 관리

## 기술 스택

| 구분 | 기술 |
|:---|:---|
| Core | React 19, React Native, Expo |
| Navigation | React Navigation |
| State | Zustand, TanStack Query |
| Native | react-native-ble-plx, react-native-mmkv, react-native-svg |
| Test | Vitest |
| Tooling | TypeScript, ESLint |

## Requirements

- Node.js
- pnpm
- Xcode 또는 Android Studio
- Expo Dev Client

## Development

```sh
pnpm install
pnpm expo prebuild
pnpm expo run:ios
pnpm expo run:android
```

Dev Client 설치 후 JavaScript만 반복 개발할 때는 아래 명령을 사용합니다.

```sh
pnpm start
```

## Environment

`EXPO_PUBLIC_DEFAULT_BACKEND_URL`로 초기 백엔드 주소를 지정할 수 있습니다.

```sh
EXPO_PUBLIC_DEFAULT_BACKEND_URL=http://localhost:8080 pnpm start
```

Expo의 `EXPO_PUBLIC_*` 값은 앱 번들에 포함되는 공개 값입니다. 비밀키나 개인 API 키는 커밋하지 않습니다.

## Validation

```sh
pnpm typecheck
pnpm lint
pnpm test
```

## 폴더 구조

```text
src/
  api/          # 백엔드 API, mock gateway, query client
  navigation/   # 화면 스택과 루트 내비게이션
  screens/      # 인증, 측정, 여정, 기록, 설정 화면
  stores/       # Zustand 상태 저장소
  components/   # 공통 UI 컴포넌트
  theme/        # 색상, 토큰, 행성 이미지
```
