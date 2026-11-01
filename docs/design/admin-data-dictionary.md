# 管理端字段清单

本文件列出管理后台涉及的每个业务对象：有哪些字段、什么类型、什么含义，以及状态枚举和校验规则。

- 写接口契约 `docs/api/admin.openapi.yaml` 时，字段以本文件为准。
- 以后设计数据库表时，也从本文件出发。
- 字段名是**接口中的名字**（camelCase）。数据库中的名字在表设计阶段确定。
- 通用的类型约定（ID、金额、时间、双语、图片、空值）见 `../api/conventions.md`，本文件不再重复。

依据：`docs/prd/admin-prd.md`（管理后台），以及 `docs/prd/mini-prd.md` 第 5、9 节（订单状态与数据表）。订单、退款、闲置的数据由小程序产生，字段与小程序保持一致。

标注【建议】的条目是 PRD 中没有明确写、由我们补充的，团队确认后去掉标注。

---

## 类型说明

| 写法 | 含义 |
| --- | --- |
| `id` | 字符串形式的 ID |
| `cents` | 整数，澳元分 |
| `int` | 整数 |
| `string` | 字符串，括号内为长度上限 |
| `bool` | 布尔值 |
| `enum` | 枚举，取值见「枚举」一节 |
| `datetime` | UTC 时间点 |
| `date` | 城市当地日期 `YYYY-MM-DD` |
| `time` | 钟点 `HH:mm` |
| `Image` | 图片对象 `{ key, url, width, height }` |
| `?` | 后缀 `?` 表示可以为 `null` |

「来源」一列：**录入**表示由店员在后台填写；**计算**表示由服务器计算，前端只展示，不提交；**快照**表示下单时抄下来、之后不再变化；**小程序**表示由用户在小程序中产生，后台只读。

---

## 一、枚举

### OrderStatus 订单状态

| 值 | 名称 | 说明 |
| --- | --- | --- |
| `unpaid` | 待支付 | 已下单未支付，库存锁定 15 分钟 |
| `pending` | 待配送 | 已支付。快递订单表示还没寄出 |
| `delivering` | 配送中 | 店员已开始配送。快递订单表示已寄出 |
| `done` | 已完成 | 已送达或已确认收货 |
| `refunding` | 退款中 | 申请退掉全部剩余商品，等待审核 |
| `refunded` | 已退款 | 商品全部退完 |
| `cancelled` | 已取消 | 未支付就关闭，没有发生扣款 |

允许的状态变化见 `docs/prd/mini-prd.md` 第 5 节。后台只能触发其中两种：`pending → delivering`（开始配送）、`pending / delivering → done`（标记已送达）。

### Fulfillment 配送方式

| 值 | 名称 |
| --- | --- |
| `local` | 线下配送 |
| `post` | 快递 |

### CompletedBy 完成人

| 值 | 名称 |
| --- | --- |
| `user` | 用户确认收货 |
| `staff` | 店员标记已送达 |
| `auto` | 时段结束 24 小时后自动完成 |

### RefundStatus 退款单状态

| 值 | 名称 |
| --- | --- |
| `open` | 待审 |
| `approved` | 已同意 |
| `rejected` | 已拒绝 |

### RefundPayoutStatus 微信退款进度【建议】

微信退款是异步的，发起后要等结果。这个字段和 `RefundStatus` 分开，用来显示钱实际退到了哪一步。

| 值 | 名称 |
| --- | --- |
| `none` | 未发起 |
| `processing` | 退款处理中 |
| `success` | 已退回 |
| `failed` | 退款失败 |

### RefundReason 退款原因

| 值 | 名称 |
| --- | --- |
| `changed_mind` | 不想要了 |
| `wrong_address` | 地址选错了 |
| `delivery_issue` | 送达有问题 |
| `other` | 其他 |

### ProductDisplayStatus 商品显示状态（计算）

| 值 | 名称 | 条件 |
| --- | --- | --- |
| `on_sale` | 在售 | 已上架，且可售数大于 0 |
| `out_of_stock` | 缺货 | 已上架，但可售数为 0 |
| `off_shelf` | 已下架 | 店员取消了上架 |

### ListingStatus 闲置帖子状态

| 值 | 名称 | 说明 |
| --- | --- | --- |
| `on_sale` | 在售 | |
| `sold` | 已出 | 卖家标记 |
| `self_removed` | 已下架 | 卖家自己下架 |
| `admin_removed` | 已下架（强制） | 店员强制下架，必须有原因 |

后台列表的「已下架」筛选项，同时包含 `self_removed` 和 `admin_removed`。

### ListingCondition 成色

| 值 | 名称 |
| --- | --- |
| `brand_new` | 全新 |
| `like_new` | 几乎全新 |
| `lightly_used` | 轻微使用 |
| `well_used` | 明显使用 |

### ContactRequestStatus 联系方式申请状态

| 值 | 名称 | 说明 |
| --- | --- | --- |
| `pending` | 待处理 | |
| `approved` | 已同意 | |
| `rejected` | 已拒绝 | 只拒绝这一次，对方可以再申请 |
| `blocked` | 已拒绝此人 | 对方不能再申请这条帖子 |

### ReportStatus 举报状态

| 值 | 名称 |
| --- | --- |
| `open` | 待处理 |
| `ignored` | 已忽略 |
| `handled` | 已处理（帖子已下架） |

### ReportReason 举报原因

| 值 | 名称 |
| --- | --- |
| `fake_info` | 虚假信息 |
| `harassment` | 骚扰 |
| `prohibited` | 违禁品 |
| `other` | 其他 |

---

## 二、管理员与概览

### Admin 管理员

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `account` | string(32) | | 登录账号 |

登录接口返回 `{ token, expiresAt, admin }`。第一版只有一两个店员账号，后台不提供管理员的增删改。

### Summary 概览

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `pendingOrderCount` | int | 计算 | 待配送订单数 |
| `deliveringOrderCount` | int | 计算 | 配送中订单数 |
| `openRefundCount` | int | 计算 | **待审退款单**数（不是退款中的订单数） |
| `openReportCount` | int | 计算 | 待处理举报数 |
| `cities` | CityOverview[] | 计算 | 每个城市的配送概况，见下表 |
| `localFeeCents` | cents | 计算 | 当前线下配送费 |
| `postFeeCents` | cents | 计算 | 当前快递邮费 |
| `freeShippingThresholdCents` | cents | 计算 | 当前包邮门槛 |

CityOverview：`{ id, nameZh, fulfillment, deliverableDistrictNamesZh: string[] }`。

---

## 三、城市与配送

### City 城市

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `nameZh` | string(20) | 录入 | 必填，不能与已有城市重复 |
| `nameEn` | string(40) | 录入 | 必填，不能与已有城市重复 |
| `fulfillment` | enum Fulfillment | 录入 | 新增时默认 `post` |
| `timezone` | string | 录入 | IANA 时区名，默认 `Australia/Sydney`【建议】 |
| `sort` | int | 录入 | 排序，越小越靠前 |

- 城市不能删除。【建议】PRD 只写了新增和修改。
- 修改配送方式，不影响已有的订单和闲置帖子。

### District 区

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `cityId` | id | 录入 | |
| `nameZh` | string(20) | 录入 | 必填 |
| `nameEn` | string(40) | 录入 | 必填 |
| `deliverable` | bool | 录入 | 是否可送。只对线下城市有意义 |
| `suburbs` | Suburb[] | 录入 | 这个区包含哪些 suburb【建议】 |

Suburb：`{ name: string(40), postcode: string(4) }`。

**为什么需要 `suburbs`【建议】：** 地址由 Google 地图检索得到，地图返回的是具体的 suburb（如 Leichhardt），而不是「内西区」这样的片区名，直接按名称匹配对不上。需要记录每个区包含哪些 suburb 或邮编，下单时据此判断地址属于哪个区。**需要和产品确认。**

### DeliveryConfig 配送费用

全店一份配置。

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `localFeeCents` | cents | 录入 | 线下配送费，默认 600。≥ 0 |
| `postFeeCents` | cents | 录入 | 快递邮费，默认 800。≥ 0 |
| `freeShippingThresholdCents` | cents | 录入 | 包邮门槛，默认 5000。≥ 0。只对快递订单生效 |
| `version` | int | 计算 | 编辑时原样提交，用于防止同时修改 |

修改只影响之后的新订单。

### DeliverySlot 送达时段

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `nameZh` | string(20) | 录入 | 如「上午」。必填 |
| `nameEn` | string(20) | 录入 | 如「Morning」。必填【建议】，小程序需要英文 |
| `startTime` | time | 录入 | 开始钟点 |
| `endTime` | time | 录入 | 结束钟点，必须晚于开始钟点 |
| `enabled` | bool | 录入 | 停用后，新的线下订单不能选 |
| `sort` | int | 录入 | |

- 至少保留一个时段，删除最后一个时返回 `LAST_SLOT`。
- 时段是每天共用的，不绑定具体日期。

---

## 四、类目

### MallCategory 商城类目 / FleaCategory 闲置类目

两种类目**字段相同，但是两个独立的对象和接口**，不要合并。

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `nameZh` | string(20) | 录入 | 必填，不能重复 |
| `nameEn` | string(40) | 录入 | 必填，不能重复 |
| `sort` | int | 录入 | |
| `inUseCount` | int | 计算 | 商城类目：在售（已上架）商品数；闲置类目：在售帖子数。大于 0 时不能删除【建议】，前端据此禁用删除按钮 |

- 只能新增和删除，不能修改名称。【建议】PRD 只写了添加和删除。

---

## 五、商品

### Product 商品

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `categoryId` | id | 录入 | 只能选商城类目 |
| `categoryNameZh` | string | 计算 | 列表展示用 |
| `nameZh` | string(60) | 录入 | 必填 |
| `nameEn` | string(120) | 录入 | 必填 |
| `priceCents` | cents | 录入 | 必须大于 0。页面上按元输入，最多两位小数 |
| `stock` | int | 录入 | **账面库存**，货架上的件数。≥ 0，且不能小于 `lockedQty` |
| `lockedQty` | int | 计算 | **锁定**：所有待支付订单占用的件数之和 |
| `sellableQty` | int | 计算 | **可售** = 账面 − 锁定。由服务器计算 |
| `salesCount` | int | 计算 | 销量 |
| `baseLikes` | int | 录入 | 基础点赞，≥ 0 的整数 |
| `likeCount` | int | 计算 | 展示的点赞数 = 基础点赞 + 用户点赞人数 |
| `onShelf` | bool | 录入 | 是否上架 |
| `displayStatus` | enum ProductDisplayStatus | 计算 | 在售 / 缺货 / 已下架 |
| `summaryZh` | string(200) | 录入 | 简介，必填 |
| `summaryEn` | string(400) | 录入 | 简介，必填 |
| `detailZh` | string(2000) | 录入 | 详情，必填 |
| `detailEn` | string(4000) | 录入 | 详情，必填 |
| `images` | Image[] | 录入 | 1～9 张【建议上限】。第一张是主图 |
| `version` | int | 计算 | 编辑时原样提交 |
| `createdAt` | datetime | 计算 | |
| `updatedAt` | datetime | 计算 | |

**入库**：单独的接口，入参 `qty`（> 0 的整数），加到账面库存上。结果不能小于锁定量。

**没有的字段**：规格、评价。不要添加。

修改价格只影响新订单。退款不会把账面库存加回来。

---

## 六、订单

### Order 订单

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `orderNo` | string | 计算 | 展示用的订单号，由服务器生成 |
| `status` | enum OrderStatus | 小程序 | |
| `fulfillment` | enum Fulfillment | 快照 | |
| `user` | UserBrief | 小程序 | 下单用户 |
| `cityNameZh` | string | 快照 | |
| `contactName` | string | 快照 | 收货人 |
| `contactPhone` | string | 快照 | 收货人手机号 |
| `address` | AddressSnapshot | 快照 | 收货地址 |
| `deliveryDate` | date? | 快照 | 线下订单的送达日期。快递订单为 `null` |
| `slotStartAt` | datetime? | 快照 | 时段开始的时间点。快递订单为 `null` |
| `slotEndAt` | datetime? | 快照 | 时段结束的时间点。快递订单为 `null` |
| `slotNameZh` | string? | 快照 | 时段名称，如「上午」 |
| `remark` | string(80)? | 小程序 | 备注 |
| `items` | OrderItem[] | 快照 | 商品明细，仅详情接口返回 |
| `itemsSummary` | string | 计算 | 商品概要，如「抽纸 ×2，毛巾 ×1」，仅列表接口返回 |
| `goodsAmountCents` | cents | 快照 | 商品金额 |
| `shippingFeeCents` | cents | 快照 | 运费（线下配送费或快递邮费）。待支付和已取消时为 0 |
| `actualAmountCents` | cents | 计算 | 列表的「实收」：待支付和已取消只计商品金额；其余状态为商品金额加运费 |
| `payExpireAt` | datetime? | 小程序 | 待支付订单的支付截止时间，也是库存锁定到期时间 |
| `paidAt` | datetime? | 小程序 | |
| `completedAt` | datetime? | 小程序 | |
| `completedBy` | enum CompletedBy? | 小程序 | |
| `cancelledAt` | datetime? | 小程序 | |
| `refunds` | RefundBrief[] | 计算 | 这张订单的退款单，仅详情接口返回。用于跳转到退款单 |
| `createdAt` | datetime | 小程序 | 下单时间 |

UserBrief：`{ id, nickname }`。

AddressSnapshot：`{ formatted, street, districtNameZh, postcode }`。`districtNameZh` 对快递订单可能为 `null`。

RefundBrief：`{ id, refundNo, status }`。

**后台的操作**：

| 操作 | 允许的当前状态 | 结果 |
| --- | --- | --- |
| 开始配送 / 标记已寄出 | `pending` | 变为 `delivering` |
| 标记已送达 | `pending`、`delivering` | 变为 `done`，`completedBy` 为 `staff` |

状态不符时返回 `INVALID_STATUS`。后台**不能**代付，不能把待支付订单标为完成，不能在订单页同意或拒绝退款。

### OrderItem 订单商品

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `productId` | id | 快照 | |
| `nameZh` | string | 快照 | 下单时的商品名 |
| `nameEn` | string | 快照 | |
| `priceCents` | cents | 快照 | 下单时的单价 |
| `qty` | int | 快照 | 购买数量 |
| `refundedQty` | int | 计算 | 已退数量 |

---

## 七、退款

### Refund 退款单

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `refundNo` | string | 计算 | 展示用的退款单号 |
| `orderId` | id | 小程序 | |
| `orderNo` | string | 计算 | |
| `user` | UserBrief | 小程序 | |
| `status` | enum RefundStatus | 小程序 / 后台 | |
| `payoutStatus` | enum RefundPayoutStatus | 计算 | 微信退款进度【建议】 |
| `reason` | enum RefundReason | 小程序 | |
| `extra` | string(200)? | 小程序 | 补充说明 |
| `items` | RefundItem[] | 小程序 | 退哪些商品、各几件 |
| `goodsAmountCents` | cents | 计算 | 退的商品金额 |
| `shippingRefundCents` | cents | 计算 | 退的运费。只有退掉全部剩余商品时才大于 0 |
| `totalAmountCents` | cents | 计算 | 合计 |
| `orderStatusBeforeApply` | enum OrderStatus? | 小程序 | 申请前的订单状态，拒绝整单退款时据此恢复 |
| `autoApproved` | bool | 小程序 | 待配送时用户自己退的，自动同意 |
| `wechatRefundNo` | string? | 计算 | 微信退款单号 |
| `reviewedBy` | string? | 后台 | 审核人账号 |
| `reviewedAt` | datetime? | 后台 | |
| `createdAt` | datetime | 小程序 | |

RefundItem：`{ orderItemId, nameZh, priceCents, qty, amountCents }`。

**后台的操作**：

| 操作 | 允许的当前状态 | 结果 |
| --- | --- | --- |
| 同意 | `open` | 向微信发起退款。退款成功后变为 `approved`，增加订单商品的已退数量；商品全部退完时，订单变为 `refunded`。**账面库存不变** |
| 拒绝 | `open` | 变为 `rejected`。整单退款的，订单恢复到申请前的状态；部分退款的，订单状态不变 |

微信退款失败时，退款单保持 `open`，返回 `REFUND_PAYOUT_FAILED`。

---

## 八、闲置

### Listing 闲置帖子

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `seller` | UserBrief | 小程序 | 只有昵称，**不含手机号和微信号** |
| `cityId` | id | 小程序 | |
| `cityNameZh` | string | 计算 | |
| `categoryId` | id | 小程序 | |
| `categoryNameZh` | string | 计算 | |
| `title` | string(40) | 小程序 | |
| `description` | string(300) | 小程序 | 仅详情接口返回 |
| `priceCents` | cents | 小程序 | 只展示，不付款 |
| `negotiable` | bool | 小程序 | 可小议 |
| `condition` | enum ListingCondition | 小程序 | |
| `status` | enum ListingStatus | 小程序 / 后台 | |
| `removeReason` | string(200)? | 后台 | 强制下架的原因 |
| `cover` | Image | 小程序 | 封面，即第一张图 |
| `images` | Image[] | 小程序 | 全部图片，1～9 张，仅详情接口返回 |
| `imageCount` | int | 计算 | 图片总数 |
| `seen` | bool | 计算 | 是否已浏览：当且仅当已浏览的版本等于当前内容版本 |
| `contentChangedSinceSeen` | bool | 计算 | 曾被浏览过、但卖家之后修改了内容。详情页据此说明「卖家修改过内容」，仅详情接口返回 |
| `comments` | Comment[] | 小程序 | 仅详情接口返回 |
| `contactRequests` | ContactRequest[] | 小程序 | 仅详情接口返回 |
| `createdAt` | datetime | 小程序 | 发布时间 |

**「已浏览」的规则：**

- 全店只有一份标记，不按店员分别记录。
- **列表接口不改变标记**，只有打开详情时才记为已浏览。
- 卖家修改了标题、描述、图片、标价、可小议、成色、类目或城市时，内容版本加 1，标记自动失效。评论、联系方式申请、标为已出、下架、举报，都不影响标记。
- 内容版本号、已浏览版本号、浏览的管理员和时间，属于服务器内部字段，接口只返回计算后的 `seen`。

**后台的操作**：

| 操作 | 允许的当前状态 | 结果 |
| --- | --- | --- |
| 强制下架 | `on_sale` | 变为 `admin_removed`，原因必填（string，1～200 字） |

状态不符时返回 `LISTING_NOT_ON_SALE`。后台**不能**修改帖子内容，不能代卖家处理联系方式申请。

### Comment 评论

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `user` | UserBrief | 小程序 | |
| `parentId` | id? | 小程序 | 回复的评论。回复只有一层 |
| `content` | string(200) | 小程序 | |
| `deleted` | bool | 小程序 | 已被作者删除。为 `true` 时 `content` 为空字符串，页面显示「该评论已删除」【建议】 |
| `createdAt` | datetime | 小程序 | |

按时间正序返回。

### ContactRequest 联系方式申请（后台视角）

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `buyer` | UserBrief | 小程序 | 申请人 |
| `note` | string(100)? | 小程序 | 附言 |
| `status` | enum ContactRequestStatus | 小程序 | |
| `attemptNo` | int | 小程序 | 同一人对这条帖子的第几次申请 |
| `createdAt` | datetime | 小程序 | |

**后台接口中绝对不能出现卖家的手机号和微信号**，包括申请记录在同意时抄下的号码。后台没有同意、拒绝、拒绝此人的接口。

---

## 九、举报

### Report 举报

| 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `id` | id | | |
| `listing` | ListingBrief | 小程序 | 被举报的帖子 |
| `comment` | CommentBrief? | 小程序 | 被举报的那一楼评论。举报整条帖子时为 `null` |
| `reason` | enum ReportReason | 小程序 | |
| `extra` | string(200)? | 小程序 | 补充说明 |
| `reporter` | UserBrief | 小程序 | |
| `status` | enum ReportStatus | 后台 | |
| `handledBy` | string? | 后台 | 处理人账号 |
| `handledAt` | datetime? | 后台 | |
| `createdAt` | datetime | 小程序 | |

ListingBrief：`{ id, title, status, cover }`。

CommentBrief：`{ id, content, deleted }`。

**后台的操作**：

| 操作 | 允许的当前状态 | 结果 |
| --- | --- | --- |
| 忽略 | `open` | 变为 `ignored`，帖子不变 |
| 下架 | `open` | 举报变为 `handled`。帖子在售时，变为 `admin_removed`，原因必填；帖子已经不是在售时，只关闭举报，**不覆盖**已有的下架原因 |

即使举报的是某一楼评论，第一版也下架整条帖子。

---

## 十、待确认事项

| 事项 | 说明 |
| --- | --- |
| 区的匹配方式 | 是否采用 `suburbs` 字段，按 suburb 或邮编判断地址属于哪个区 |
| 微信退款进度 | 是否在退款单上增加 `payoutStatus`，向店员展示「退款处理中」 |
| 类目能否改名 | PRD 只写了新增和删除 |
| 城市能否删除 | PRD 只写了新增和修改 |
| 各字段的长度上限 | PRD 只规定了部分字段，其余为建议值 |
| 金额字段以 `Cents` 结尾 | 见 `../api/conventions.md` |
