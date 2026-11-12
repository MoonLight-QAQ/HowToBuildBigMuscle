import type { Report, ReportPage } from '@/api/report'

/** 创建独立的虚构举报；覆盖字段只用于测试，无网络或共享修改。 / Create an isolated synthetic report with test overrides and no network/shared effects. */
export function createReport(overrides: Partial<Report> = {}): Report {
  return {
    id: '9000000000000000030',
    listing: {
      id: '9000000000000000031',
      title: '虚构演示帖子',
      status: 'on_sale',
      cover: {
        key: 'dev/report/v1/mock.jpg',
        url: 'https://example.invalid/mock.jpg',
        width: 600,
        height: 800,
      },
      removeReason: null,
    },
    comment: null,
    reason: 'fake_info',
    extra: null,
    reporter: { id: '9000000000000000032', nickname: '虚构举报用户' },
    status: 'open',
    handledBy: null,
    handledAt: null,
    createdAt: '2026-11-01T00:05:00Z',
    version: 0,
    ...overrides,
  }
}

/** 创建单页测试响应；保留显式空列表，不补业务记录。 / Create a test page while preserving explicitly empty rows. */
export function createReportPage(items: Report[] = [createReport()]): ReportPage {
  return { items, total: items.length, page: 1, pageSize: 20 }
}

/** 创建可控制迟到响应的Promise；仅测试时间顺序，无请求。 / Create a controllable promise for testing response order without requests. */
export function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void
  const promise = new Promise<T>(
    /** 保存完成入口用于测试；不执行外部动作。 / Save settlement functions for tests without external effects. */
    function initialize(done, fail) {
      resolve = done
      reject = fail
    },
  )
  return { promise, resolve, reject }
}
