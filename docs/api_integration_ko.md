# API 연동 노트 (MVP 최종 구조 기준)

Tauri/Web은 Spring Boot API만 호출한다. FastAPI 상세 리포트 서비스는 직접 호출하지 않는다.

## 아키텍처 위치

```text
Tauri/Web → Spring Boot API → PostgreSQL
별도 ESP 노트북/Agent → (dB 측정값 업로드) → Spring Boot API
```

1. Tauri/Web은 ESP32-S3 Serial을 직접 열지 않는다.
2. MVP에서 `control_commands`가 삭제되어 서버를 통한 가전 제어 명령 생성도 없다. 로봇 회피 등은 프론트엔드 GLB 시뮬레이션으로만 표현한다.
3. Agent 상태(`device_agents`)도 서버에서 삭제되어 화면의 Agent 카드는 로컬 표시 전용이다.

## 환경 변수

| 변수 | 설명 | 기본값 |
|---|---|---|
| `VITE_SOUNDCARE_API_BASE_URL` | Spring Boot API 주소 | `http://localhost:18080` |
| `VITE_USE_MOCK_API` | 샘플 데이터 모드 | `false` |
| `VITE_USE_API_FALLBACK` | API 실패 시 로컬 기본값 사용 | `false` |
| `VITE_DEV_AUTH_NICKNAME` | 로컬 dev 로그인 닉네임 | `SoundCare Local Tester` |

## 사용하는 API

### Auth / Users

```text
POST  /api/auth/google        # { idToken, email, nickname }
GET   /api/auth/me
GET   /api/users/me
PATCH /api/users/me           # nickname, aiRoutineConsent, aiDataUseConsent, householdLabel, defaultRoomId
```

온보딩 화면은 `PATCH /api/users/me`로 처리한다 (`/api/users/onboarding`, `/api/users/nickname/check` 삭제).

### Home / Devices

```text
GET /api/home/current-status
GET /api/devices
GET /api/user-devices
GET /api/settings/runtime
```

### Settings

```text
GET   /api/settings/sensitive-appliances
POST  /api/settings/sensitive-appliances        # userRegisteredDeviceId, serviceLabel, dbThreshold, sensitivityLevel, reportInclusion, policies[]
PATCH /api/settings/sensitive-appliances/{id}
GET   /api/settings/appliance-control-policies
PATCH /api/settings/appliance-control-policies/{policyId}
```

`confidenceThreshold`, `responsePolicy`, `dbThresholdAvg/Max` 필드는 제거되었다. 단일 `dbThreshold`와 `sensitivityLevel`을 사용한다.

### Events

```text
GET /api/events/noise
GET /api/events/noise/{eventId}
GET /api/events/appliance-measurements
GET /api/events/appliance-measurements/latest
GET /api/events/reactions
POST /api/events/reactions/manual
```

측정값 응답 필드: `serviceLabel`, `decibelAvg`, `decibelMax`, `measurementSource`, `measuredAt` (relativeNoiseLevel/moduleId/agentId 등 telemetry 필드 삭제).

### Notifications / Routines / Reports

```text
GET   /api/notifications/recent, /api/notifications
PATCH /api/notifications/{id}/read
GET   /api/routines
PATCH /api/routines/{routineId}/status?status=ACCEPTED|DISMISSED
POST  /api/reports/basic
POST  /api/reports/detailed
GET   /api/reports/{reportId}
POST  /api/reports/{reportId}/regenerate
```

## 삭제된 API (호출 금지)

```text
/api/device-agents*
/api/control-commands*
/api/robot-avoid-events
/api/ai-consents*
/api/data-deletion-requests*
/api/reports/{id}/export
DELETE /api/reports/{id}
/api/routines/{id}/apply, /dismiss, /generate
```

해당 화면 동작은 다음으로 대체되었다.

| 기존 | 대체 |
|---|---|
| GPT 동의/철회 | `PATCH /api/users/me` (`aiDataUseConsent`) |
| 데이터 삭제 요청 | MVP 제외 — 로컬 안내만 표시 |
| Agent 상태 | 로컬 표시 전용 mock 데이터 |
| 로봇 회피 이벤트 | 프론트엔드 GLB 경로 시뮬레이션 |
| 리포트 export | 클라이언트에서 리포트 본문 조회 후 로컬 저장 |
| 루틴 apply/dismiss | `PATCH /api/routines/{id}/status` |
