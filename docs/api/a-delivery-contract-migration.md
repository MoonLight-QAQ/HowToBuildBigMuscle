# W-00e：A 区配送字段契约迁移

任务：[Issue #62](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/62)。
依据：已合并的 [PR #61](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/pull/61)、[ADR 0005](../adr/0005-delivery-zone-and-suburb.md) 和 [字段清单](../design/admin-data-dictionary.md)。

## 目的与边界

订单地址和概览投影采用配送大区与 suburb 模型。本次只迁移 `admin.openapi.yaml` 的 A 区及相应生成类型，维护任务索引和本说明，不实现城市／配送设置、地图检索、字典导入或 Go 服务。

| 对象 | 旧字段 | 新字段与规则 |
| --- | --- | --- |
| AddressSnapshot | districtNameZh | zoneNameZh，必返，沿用 string 或 null 及最长 60 字符；快递订单可为 null |
| AddressSnapshot | 无 | suburb，线下及快递均必返、非 null，名称最长 40 字符，与 Suburb 字典一致 |
| AddressSnapshot | 无 | state，线下及快递均必返，引用 A 区 AustralianState |
| CityOverview | deliverableDistrictNamesZh | deliverableZoneNamesZh，必返字符串数组，元素沿用最长 40 字符 |
| Summary | localFeeCents | 字段名不变，明确为全店默认线下费，大区可覆盖；不能作为所有订单最终运费 |

州枚举为 `NSW/VIC/QLD/WA/SA/TAS/ACT/NT`。保留字符串 ID、四位字符串邮编、AUD 整数分和 UTC 约定。订单电话权限、退款和举报的字段及状态规则不变。

## 配送摘要语义

- 线下城市按大区 `sort` 排序，仅列出至少有一个最终可送 suburb 的大区名称。
- 默认不可送、但存在成员覆盖为可送时，纳入概览。
- 默认可送、但成员全部不可送，或没有成员时，不纳入概览。
- 快递城市的概览大区名数组必须为 `[]`。这表示该字段不展示快递服务范围，不能据此判断快递城市没有配置大区。
- ADR 0005 已规定线下和快递都以大区成员圈定城市范围。快递忽略线下可送开关及大区运费，仍需本市成员关系；该准入逻辑归城市／配送及未来小程序服务实现，不在概览客户端重新推算。

`CityOverview` 的 JSON Schema 可验证快递数组为空；它没有源成员数据，不能用 Schema 证明服务端的汇总计算正确。两侧覆盖场景需在后续共享 Mock 和服务实现中验证。

## 破坏性变更与历史数据

这次删除旧字段并新增 required，是破坏性契约迁移。严格响应校验不会同时接收旧字段，也不添加静默兼容分支、猜测默认值或 null 占位。契约未合入前，既有分支继续按各自当前契约工作；合入后消费者必须同步适配，不能仅更新生成类型而继续发送旧投影。

订单地址和费用是下单时保存的快照。禁止使用当前大区名称、成员关系、suburb 字典或现行运费反推并重写旧订单。`suburb`、`state` 对迁移后的响应为必返；真实历史记录若缺少这些字段，需要在真实接入前单独核实原始快照来源及后端迁移策略。本轮不回填真实数据，不声称已经验证历史数据兼容，也不把编造字段作为恢复方案。

## 原 Story 的后续适配

保持一条 Story、一个分支、一个 PR；本任务只提供契约基线。

- 订单 [#33 / PR #57](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/pull/57)：契约合入后在原分支合入最新 develop，适配响应解析、Mock、详情显示和测试，覆盖新必返字段、快递 null 大区名、旧投影拒绝及历史快照边界。路由、登录、城市示例等原前置继续按原 Story 验收。
- 概览 [#35 / PR #59](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/pull/59)：在原分支同步最新 develop，适配字段、Mock、UI 和测试；更新“全店默认线下配送费”文案，验证最终可送成员的两种覆盖及快递空数组。服务端计数与导航入口仍归原 Story。
- 退款和举报如同步后生成类型变化，按实际类型检查定位影响；不顺手改动其业务规则。

## 验证与协作

1. 检查 YAML 重复键、本地引用、所有显式示例（包括锚点展开）及 JSON Schema 2020-12。
2. 正反例覆盖八个州、非法／缺失／null 字段、旧字段拒绝、前导零邮编、快递 null 大区名和快递概览非空数组拒绝。
3. 比较 A 区外原文，公共部分和 B/C 必须逐字节相同；路径及 operationId 保持不变。
4. 使用项目固定工具链运行 `pnpm gen:api`，重复生成应相同；禁止手改生成结果。执行前端 lint、格式、类型、测试、构建及远程契约检查。

沿用 PR #37 的共享契约协作方式：B/C 尚需继续填契约，按 A 区审查，不锁整份 `admin.openapi.yaml`；自动生成文件不锁整份、不手改；任务索引不锁整份。完成任务的 PR 仅将这份独立迁移说明加入锁定清单。Issue 和 Projects 的状态、日期及负责人由团队维护；本轮通过进度评论记录实际成果。
