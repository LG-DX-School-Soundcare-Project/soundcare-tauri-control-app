// MVP 기준: data_deletion_requests 테이블/API는 삭제되었다.
// 데이터 삭제 요청은 서버로 전송하지 않고 로컬 안내용으로만 처리한다.

export async function createDataDeletionRequest(body) {
  return {
    requestId: `local-${Date.now()}`,
    scope: body.scope,
    status: body.confirmText === 'DELETE' ? 'NOT_SUPPORTED_IN_MVP' : 'FAILED',
    requestedAt: new Date().toISOString(),
    resultSummary: {
      note: 'MVP에서는 서버 측 데이터 삭제 요청 기능이 제외되었습니다. 운영자에게 문의하세요.'
    },
    metadata: body.metadata ?? {}
  };
}

export async function fetchDataDeletionRequest(requestId) {
  return {
    requestId,
    scope: 'ALL',
    status: 'NOT_SUPPORTED_IN_MVP',
    requestedAt: new Date().toISOString(),
    resultSummary: {
      note: 'MVP에서는 서버 측 데이터 삭제 요청 기능이 제외되었습니다.'
    },
    metadata: {}
  };
}
