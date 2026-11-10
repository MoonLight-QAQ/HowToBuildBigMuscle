<script setup lang="ts">
import { onMounted } from 'vue'
import {
  ElAlert,
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElImage,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import type { Report, ReportStatus } from '@/api/report'
import {
  REPORT_COPY,
  REPORT_LISTING_STATUS,
  REPORT_REASON,
  REPORT_STATUS,
} from '@/constants/report'
import { displayDateTime } from '@/utils/date'
import {
  canHandleReport,
  reportListingLabel,
  reportReasonLabel,
  reportStatusPresentation,
} from './report-presentation'
import { useReportPage } from './use-report-page'

const props = withDefaults(defineProps<{ initialStatus?: ReportStatus; timezone?: string }>(), {
  timezone: 'UTC',
})
const emit = defineEmits<{ openListing: [id: string] }>()
/** 读取宿主待处理入口；无请求或副作用。 / Read the host filter without requests or effects. */
function getInitialStatus(): ReportStatus | undefined {
  return props.initialStatus
}
const {
  items,
  status,
  page,
  pageSize,
  total,
  loading,
  empty,
  errorMessage,
  selectedId,
  report,
  reason,
  busy,
  detailLoading,
  detailErrorMessage,
  actionErrorMessage,
  actionMessage,
  select,
  close,
  refreshDetail,
  reload,
  filter,
  setPage,
  setPageSize,
  ignore,
  takedown,
} = useReportPage(getInitialStatus)
/** 请求宿主打开帖子；不预读私人联系方式或改变已浏览标记。 / Ask the host to open a listing without prefetching private contacts or changing seen markers. */
function openListing(): void {
  if (report.value && !busy.value && !detailLoading.value)
    emit('openListing', report.value.listing.id)
}
onMounted(reload)
</script>

<template>
  <section class="report-page" aria-labelledby="report-title">
    <div class="heading">
      <div>
        <h1 id="report-title">举报</h1>
        <p>先发后审，读取举报不会将帖子标为已浏览。时间显示：{{ timezone }}</p>
      </div>
      <ElButton :disabled="busy || loading || detailLoading" @click="reload()">刷新列表</ElButton>
    </div>
    <ElAlert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
      role="alert"
    />
    <template v-if="selectedId">
      <div class="heading">
        <ElButton :disabled="busy" @click="close">返回举报列表</ElButton>
        <ElButton :disabled="busy || detailLoading" @click="refreshDetail">刷新处理资料</ElButton>
      </div>
      <ElAlert
        v-if="actionErrorMessage"
        :title="actionErrorMessage"
        type="error"
        :closable="false"
        show-icon
        role="alert"
      />
      <ElAlert
        v-if="actionMessage"
        :title="actionMessage"
        :type="actionMessage === REPORT_COPY.canceled ? 'info' : 'success'"
        :closable="false"
        show-icon
        role="status"
      />
      <ElCard v-if="detailLoading" shadow="never" role="status"
        ><p>正在读取最新举报…</p>
        <ElSkeleton :rows="6" animated
      /></ElCard>
      <ElCard v-else-if="detailErrorMessage" shadow="never" role="alert"
        ><ElAlert :title="detailErrorMessage" type="error" :closable="false" /><ElButton
          class="gap"
          :disabled="busy"
          @click="refreshDetail"
          >重试处理资料</ElButton
        ></ElCard
      >
      <ElCard v-else-if="report" shadow="never">
        <template #header
          ><div class="heading">
            <h2>举报处理资料</h2>
            <ElTag :type="REPORT_STATUS[report.status].type">{{
              REPORT_STATUS[report.status].label
            }}</ElTag>
          </div></template
        >
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="举报编号">{{ report.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="举报对象">{{
            report.comment === null ? '整条帖子' : '评论'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="举报原因">{{
            REPORT_REASON[report.reason]
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="补充说明">{{ report.extra ?? '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="举报人">{{ report.reporter.nickname }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="`举报时间（${timezone}）`">{{
            displayDateTime(report.createdAt, timezone)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="处理人">{{ report.handledBy ?? '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="`处理时间（${timezone}）`">{{
            displayDateTime(report.handledAt, timezone)
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <div class="listing gap">
          <ElImage
            :src="report.listing.cover.url"
            :alt="report.listing.title"
            fit="contain"
            class="cover"
            ><template #error><span>封面暂不可用</span></template></ElImage
          >
          <div>
            <h3>{{ report.listing.title }}</h3>
            <p>{{ REPORT_LISTING_STATUS[report.listing.status] }}</p>
            <p>已有下架原因：{{ report.listing.removeReason ?? '—' }}</p>
            <ElButton :disabled="busy" @click="openListing">查看关联帖子</ElButton>
          </div>
        </div>
        <div v-if="report.comment" class="gap">
          <h3>被举报评论（{{ report.comment.id }}）</h3>
          <p>
            {{ report.comment.deleted ? '评论已删除，正文不再展示。' : report.comment.content }}
          </p>
        </div>
        <div v-if="canHandleReport(report)" class="gap">
          <p>忽略只关闭举报；即使举报评论，下架处理也作用于整条帖子。</p>
          <template v-if="report.listing.status === 'on_sale'"
            ><label for="report-remove-reason">下架原因（展示给卖家）</label
            ><ElInput
              id="report-remove-reason"
              v-model="reason"
              type="textarea"
              :rows="3"
              :disabled="busy"
              placeholder="填写1–200个字符，不能全为空白"
          /></template>
          <p v-else>帖子已非在售，本次仅关闭举报，保留原状态和已有原因。</p>
          <div class="actions gap">
            <ElButton :disabled="busy" :loading="busy" @click="ignore">忽略举报</ElButton
            ><ElButton type="danger" :disabled="busy" :loading="busy" @click="takedown">{{
              report.listing.status === 'on_sale' ? '强制下架整条帖子' : '仅关闭举报'
            }}</ElButton>
          </div>
        </div>
        <p v-else class="gap">举报已结束处理，不能重复提交。</p>
      </ElCard>
    </template>
    <template v-else>
      <div class="filters">
        <label for="report-status">举报状态</label
        ><ElSelect
          id="report-status"
          :model-value="status || 'all'"
          aria-label="举报状态"
          :disabled="loading || busy"
          @update:model-value="filter"
          ><ElOption value="all" label="全部状态" /><ElOption
            v-for="(entry, value) in REPORT_STATUS"
            :key="value"
            :value="value"
            :label="entry.label"
        /></ElSelect>
      </div>
      <ElCard v-if="loading" shadow="never" role="status"
        ><p>正在加载举报…</p>
        <ElSkeleton :rows="5" animated
      /></ElCard>
      <div v-else-if="errorMessage" role="alert"><ElButton @click="reload()">重试</ElButton></div>
      <ElEmpty v-else-if="empty" description="当前筛选下没有举报" />
      <ElTable v-else :data="items" aria-label="举报列表" row-key="id">
        <ElTableColumn label="帖子／目标" min-width="220"
          ><template #default="{ row }"
            ><strong>{{ row.listing.title }}</strong>
            <p>
              {{
                row.comment === null ? '整条帖子' : row.comment.deleted ? '评论（已删除）' : '评论'
              }}
              · {{ reportListingLabel(row as Report) }}
            </p></template
          ></ElTableColumn
        >
        <ElTableColumn label="原因与补充" min-width="180"
          ><template #default="{ row }"
            >{{ reportReasonLabel(row as Report) }}
            <p>{{ row.extra ?? '—' }}</p></template
          ></ElTableColumn
        >
        <ElTableColumn label="举报人" min-width="120"
          ><template #default="{ row }">{{ row.reporter.nickname }}</template></ElTableColumn
        >
        <ElTableColumn :label="`举报时间（${timezone}）`" min-width="190"
          ><template #default="{ row }">{{
            displayDateTime(row.createdAt, timezone)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="状态" width="100"
          ><template #default="{ row }"
            ><ElTag :type="reportStatusPresentation(row as Report).type">{{
              reportStatusPresentation(row as Report).label
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" width="130"
          ><template #default="{ row }"
            ><ElButton link type="primary" :disabled="busy" @click="select(row.id)"
              >查看与处理</ElButton
            ></template
          ></ElTableColumn
        >
      </ElTable>
      <ElPagination
        v-if="!errorMessage && !loading"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        :disabled="busy"
        layout="total, sizes, prev, pager, next"
        @update:current-page="setPage"
        @update:page-size="setPageSize"
      />
    </template>
  </section>
</template>

<style scoped lang="scss">
.report-page {
  display: grid;
  gap: $space-lg;
}
.heading,
.listing,
.actions,
.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-md;
}
.heading {
  justify-content: space-between;
}
h1 {
  margin: 0;
  font-size: $font-size-title;
}
h2,
h3 {
  margin: 0;
  font-size: $font-size-large;
}
p {
  color: $text-secondary;
  margin: $space-sm 0;
  overflow-wrap: anywhere;
}
.gap {
  margin-top: $space-lg;
}
.cover {
  width: $space-xl * 4;
  height: $space-xl * 4;
}
.filters .el-select {
  width: $space-xl * 8;
}
</style>
