# Spring Boot API 연동 노트

## 기본 원칙

Tauri/Web 앱은 Spring Boot API만 직접 호출한다. FastAPI 상세 리포트 서비스는 내부 서비스이며 프론트엔드가 직접 호출하지 않는다.

원본 오디오는 서버로 전송하지 않는다. 소음 분류는 스마트폰의 YAMNet TFLite 모델에서 로컬로 수행되고, 서버에는 라벨, 신뢰도, dB, 센서 요약값, 반응 데이터만 저장된다.

## Tauri/Web 역할 경계

Tauri/Web은 ESP32-S3 Serial을 직접 열지 않고, Spring Boot 제어 명령 API로 ESP 제어 명령을 생성하지도 않는다. ESP 제어와 Serial 통신은 별도 노트북의 Agent/firmware 실행 환경에서 담당한다.

```text
Flutter Android App → Spring Boot API → PostgreSQL
별도 ESP 노트북/Agent → Spring Boot API → PostgreSQL
Tauri/Web → Spring Boot API → 설정·대시보드·리포트·3D 표시
```

핵심 정리:

1. Tauri/Web은 ESP32-S3 Serial을 직접 열지 않는다.
2. Tauri/Web은 ESP32-S3 제어 명령을 생성하지 않는다.
3. ESP 제어는 별도 노트북에서 Agent/firmware 테스트로 수행한다.
4. Tauri/Web은 백엔드에 저장된 설정, 대시보드, 리포트, 3D 표시 데이터를 조회한다.
5. ESP 측정 telemetry가 백엔드에 있으면 3D 화면에서 보조 시각화 값으로만 사용할 수 있다.
6. MVP에서는 공식 LG ThinQ API를 연동하지 않는다.

## 환경 변수

| 변수 | 설명 | 기본값 |
|---|---|---|
| `VITE_SOUNDCARE_API_BASE_URL` | Spring Boot API 주소 | `http://localhost:8080` |
| `VITE_USE_MOCK_API` | 샘플 데이터 사용 여부 | `true` |
| `VITE_NOTIFICATION_POLL_INTERVAL_MS` | 알림 폴링 간격 | `15000` |

Tauri에는 Serial 포트와 ESP 제어 대상 변수를 추가하지 않는다. Serial 통신은 별도 ESP 노트북/Agent가 담당한다.

## 주요 API

### Auth

- `POST /api/auth/google`
- `GET /api/me`

개발 모드에서는 placeholder 토큰을 사용한다. 운영 환경에서는 Google OAuth 결과를 Spring Boot로 전달하고 JWT를 발급받는다.

### 기기

- `GET /api/devices`
- `GET /api/devices/{deviceId}`
- `POST /api/devices`
- `GET /api/devices/runtime-settings`

지원 기기 유형은 `IOT_HUB_PHONE`, `USER_DEVICE_PHONE`, `APPLIANCE_SOUND_MODULE`, `APPLIANCE_NOISE_METER`, `ENV_SENSOR`이다.

### 민감 가전 설정

- `GET /api/sensitive-appliances`
- `PATCH /api/sensitive-appliances`
- `GET /api/control-policies`
- `PATCH /api/control-policies/{serviceLabel}`

설정 항목은 민감 여부, 기본 dB 기준, 가전별 대응 dB 기준, 신뢰도 기준, 자동 대응 정책, 알림 정책, 리포트 포함 여부를 포함한다.

### 홈 상태와 이벤트

- `GET /api/home/current-status`
- `GET /api/iot/events`
- `GET /api/robot-avoidance-events`

3D 홈 화면은 로봇청소기 회피 이벤트를 기반으로 GLB 경로를 변경한다. 이 동작은 프론트엔드 시뮬레이션이다.

### Appliance Controller Agent

- `GET /api/device-agents`
- `GET /api/device-agents/{agentId}`

Agent 상태에는 `agentId`, `online`, `hostName`, `lastSeenAt`, `connectedModuleIds`, `lastSerialPort`가 포함된다. Tauri/Web은 이 값을 표시만 하며 Serial 포트를 직접 열지 않는다.

### 가전 모형 측정값(텔레메트리)

- `GET /api/events/appliance-measurements/latest`
- `GET /api/events/appliance-measurements`

조회 예시:

```text
GET /api/events/appliance-measurements/latest?serviceLabel=robot_vacuum
GET /api/events/appliance-measurements/latest?agentId=appliance-controller-pc-01&sourceModuleId=esp32s3-appliance-01
```

텔레메트리에는 `moduleId`, `applianceType`, `playbackState`, `sampleName`, `volumePercent`, `relativeDb`, `decibelAvg`, `decibelMax`, `rms`, `measuredBy`, `source`, `moduleTimestampMs`, 수신/업로드 시각이 포함된다. INMP441로 측정한 상대 dB 값이며, ESP32-S3는 WAV 재생과 측정만 담당한다.

### 알림

- `GET /api/notifications/recent`
- `GET /api/notifications`
- `PATCH /api/notifications/{notificationId}/read`

알림 유형은 `LOUD_NOISE_DETECTED`, `SENSITIVE_APPLIANCE_DETECTED`, `AUTO_CONTROL_APPLIED`, `ROBOT_ROUTE_CHANGED`, `NON_CONTROLLABLE_WARNING`, `ROUTINE_CREATED`를 사용한다.

### 루틴

- `GET /api/routines/recommendations`
- `POST /api/routines/generate`
- `PATCH /api/routines/{routineId}/apply`
- `PATCH /api/routines/{routineId}/dismiss`

상태 값은 `SUGGESTED`, `APPLIED`, `AUTO_APPLIED`, `DISMISSED`, `DISABLED`이다.

### 리포트와 GPT 동의

- `GET /api/reports/basic`
- `POST /api/ai-consents/gpt-report`
- `POST /api/reports/detailed`

상세 리포트 요청 전에는 사용자의 명시적 동의를 받아야 한다. 상세 리포트에는 집계 요약 데이터만 사용한다.

## WebSocket 확장

초기 구현은 폴링을 기본으로 한다. WebSocket은 `/ws/notifications`를 placeholder로 두었으며, 실제 엔드포인트와 인증 방식은 백엔드 구현 후 맞춘다.

## TODO

- JWT 만료 처리와 refresh token 정책 반영
- 에러 코드와 JSON Schema 기반 입력 검증 연결
- 실제 배포 URL과 CORS 정책 확인
