import type { components } from '@/api/generated/admin'

type Report = components['schemas']['Report']
// 虚构占位图嵌入数据URI，不连接外部图片服务。 / Inline synthetic image; no external image service.
const MOCK_COVER_URL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#eeeeee"/><text x="300" y="400" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="48" fill="#666666">MOCK</text></svg>',
  )
export type ReportMockListing = components['schemas']['ReportListingBrief'] & {
  version: number
  contentVersion: number
  seenContentVersion: number | null
  isDeleted: boolean
}

/** 创建独立虚构举报快照，覆盖三种处理状态和四种帖子状态，无真实个人资料。 / Create isolated synthetic reports spanning review/listing states without real personal data. */
export function createReportFixtures(): Report[] {
  const reports: Report[] = []
  const listingStatuses = ['on_sale', 'sold', 'self_removed', 'admin_removed'] as const
  const reasons = ['fake_info', 'harassment', 'prohibited', 'other'] as const
  for (let index = 0; index < 12; index += 1) {
    const listingStatus = listingStatuses[index % 4]!
    const status = index < 8 ? 'open' : index % 2 === 0 ? 'ignored' : 'handled'
    const deleted = index % 3 === 2
    reports.push({
      id: String(9000000000000000200n + BigInt(index)),
      listing: {
        id: String(9000000000000000300n + BigInt(index)),
        title: `虚构演示帖子${index + 1}`,
        status: listingStatus,
        cover: {
          key: 'dev/report/demo/v1/cover.svg',
          url: MOCK_COVER_URL,
          width: 600,
          height: 800,
        },
        removeReason:
          listingStatus === 'self_removed'
            ? '卖家原下架原因'
            : listingStatus === 'admin_removed'
              ? '已有后台下架原因'
              : null,
      },
      comment:
        index % 3 === 0
          ? null
          : {
              id: String(9000000000000000400n + BigInt(index)),
              content: deleted ? '' : '虚构演示评论，仅供开发验证',
              deleted,
            },
      reason: reasons[index % 4]!,
      extra: index % 2 === 0 ? null : '虚构演示补充说明',
      reporter: {
        id: String(9000000000000000500n + BigInt(index)),
        nickname: `虚构举报用户${index + 1}`,
      },
      status,
      handledBy: status === 'open' ? null : 'mock-report-admin',
      handledAt: status === 'open' ? null : '2026-11-01T00:06:00Z',
      createdAt: '2026-11-01T00:05:00Z',
      version: status === 'open' ? 0 : 1,
    })
  }
  return reports
}

/** 从举报投影建立去重的虚构帖子账本；保留内容版本和已浏览版本供只读检查。 / Build unique synthetic listing ledgers with content and seen versions for read-only inspection. */
export function createReportListingFixtures(
  reports: readonly Report[] = createReportFixtures(),
): ReportMockListing[] {
  const listings = new Map<string, ReportMockListing>()
  for (const report of reports) {
    if (!listings.has(report.listing.id))
      listings.set(report.listing.id, {
        ...structuredClone(report.listing),
        version: 4,
        contentVersion: 3,
        seenContentVersion: 2,
        isDeleted: false,
      })
  }
  return [...listings.values()]
}
