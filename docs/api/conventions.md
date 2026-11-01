# 接口通用约定

本文件约定拾澳所有接口的通用规则，适用于管理端契约 `admin.openapi.yaml` 和以后的小程序契约 `mini.openapi.yaml`。

写契约、写模拟数据、写前端请求代码、写后端接口时，都以本文件为准。各业务对象有哪些字段，见 `docs/design/admin-data-dictionary.md`。

标注【建议】的条目是 PRD 中没有明确写、由我们补充的约定，团队确认后去掉标注。

---

## 1. 地址与路径

| 端 | 前缀 |
| --- | --- |
| 管理端 | `/api/admin` |
| 小程序 | `/api/mini/v1` |
| APP（以后） | `/api/app/v1` |

路径规则：

- 资源名用**复数**、**kebab-case**：`/orders`、`/mall-categories`。
- 单个资源：`/orders/{id}`。
- 对资源的**动作**（改变状态的操作），用 `POST /资源/{id}/动作名`，动作名用 kebab-case：`POST /orders/{id}/start-delivery`。
- 路径中不出现动词，动作除外。

## 2. HTTP 方法

| 方法 | 用途 | 示例 |
| --- | --- | --- |
| `GET` | 查询，不改变任何数据 | `GET /orders` |
| `POST` | 新增；执行动作 | `POST /products`、`POST /refunds/{id}/approve` |
| `PUT` | 修改整个资源（请求中带全部可编辑字段） | `PUT /products/{id}` |
| `DELETE` | 删除 | `DELETE /mall-categories/{id}` |

不使用 `PATCH`。

## 3. 请求

- 请求体和响应体都是 JSON，`Content-Type: application/json`。
- 字段名用 **camelCase**。
- 查询参数也用 camelCase：`GET /orders?status=pending&page=1`。
- 不要相信前端传来的操作者身份、价格、库存。操作者以 token 为准，金额和库存以服务器计算为准。

## 4. 鉴权

- 除登录接口外，所有接口都要在请求头中带 token：
  ```http
  Authorization: Bearer <token>
  ```
- 管理员 token 与顾客 token **互不通用**。用顾客 token 调管理端接口，返回 `NEED_LOGIN`。
- 登录成功返回 `token` 和过期时间 `expiresAt`。token 过期或无效，返回 `NEED_LOGIN`，前端跳转登录页。

## 5. 响应格式

### 成功

```json
{ "ok": true, "data": { } }
```

- `data` 是对象或数组。没有内容需要返回时（如删除成功），`data` 为 `null`。

### 失败

```json
{
  "ok": false,
  "code": "STOCK_BELOW_LOCKED",
  "message": "账面库存不能小于已锁定的 3 件",
  "details": [ { "field": "stock", "message": "不能小于 3" } ]
}
```

| 字段 | 说明 |
| --- | --- |
| `code` | 错误码，**英文大写加下划线**。前端按它决定怎么处理 |
| `message` | 中文说明，可以直接提示给用户。管理端一律中文 |
| `details` | 可选。参数校验失败时，列出每个出错字段和原因 |

### HTTP 状态码

| 状态码 | 场景 |
| --- | --- |
| `200` | 成功 |
| `400` | 参数校验失败（`VALIDATION_FAILED`） |
| `401` | 未登录或 token 失效（`NEED_LOGIN`） |
| `403` | 已登录但没有权限（`FORBIDDEN`） |
| `404` | 资源不存在（`NOT_FOUND`） |
| `409` | 业务规则不允许，例如状态已变化、名称重复、库存不足 |
| `500` | 服务器内部错误（`INTERNAL_ERROR`） |

前端以 `code` 为准判断错误类型，HTTP 状态码只作为辅助。

## 6. 分页

### 请求

| 参数 | 说明 |
| --- | --- |
| `page` | 页码，从 **1** 开始，默认 1 |
| `pageSize` | 每页条数，默认 20，最大 100 |

### 响应

```json
{
  "ok": true,
  "data": {
    "items": [ ],
    "total": 128,
    "page": 1,
    "pageSize": 20
  }
}
```

数量很少、不需要分页的列表（类目、城市、时段），也统一返回 `{ "items": [ ] }`，只是不带分页字段。这样前端处理列表的方式是一致的。

## 7. 数据类型

### ID

- 所有 ID 都是**字符串**，例如 `"1854239876543209472"`。
- 原因：ID 由雪花算法生成，是 64 位整数，超出了 JavaScript 能精确表示的数字范围。用数字传输会丢失精度。
- 前端不要把 ID 转成数字，不要对 ID 做大小比较。

### 金额

- 所有金额都是**整数**，单位是**澳元分**。39 元写成 `3900`。
- **字段名统一以 `Cents` 结尾**：`priceCents`、`shippingFeeCents`。【建议】这样看字段名就知道单位，前端和后端都不容易弄错。
- 前端显示时转换为元，输入的元在提交前转换为分。不要对元做浮点运算。

### 时间

| 类型 | 格式 | 示例 | 用于 |
| --- | --- | --- | --- |
| 时间点 | ISO 8601，**UTC**，以 `Z` 结尾 | `"2026-11-01T03:30:00Z"` | 创建时间、支付时间、时段的开始和结束等 |
| 日期 | `YYYY-MM-DD`，表示**城市当地**的日期 | `"2026-11-02"` | 线下订单的送达日期 |
| 钟点 | `HH:mm`，24 小时制 | `"08:00"` | 送达时段的开始和结束钟点 |

- 服务器统一返回 UTC 时间点。前端用 `src/utils/date.ts` 中的函数，按**城市时区**格式化显示（悉尼、墨尔本、堪培拉为 `Australia/Sydney`）。
- 澳洲有夏令时，前端和后端都不要写死时差。

### 双语字段

- 商品、类目、城市、区、时段等数据有中英文两个版本，字段名后缀为 `Zh` 和 `En`：`nameZh`、`nameEn`。
- 管理端新增和编辑时，两个都必填。

### 枚举

- 枚举值用**小写英文加下划线**：`pending`、`admin_removed`。
- 显示文案由前端在 `src/constants/` 中定义，接口不返回枚举的中文。

### 空值

- 字段**始终出现**在响应中。没有值时为 `null`，不要省略字段。
- 数组没有元素时为 `[]`，不要为 `null`。

### 图片

图片存放在 **AWS S3**，由前端直接上传，不经过后端中转：

1. 前端调用本端的上传接口（如 `POST /api/admin/uploads/presign`），告诉后端文件用途、类型和大小。
2. 后端校验后，返回一个有时效的**预签名上传地址** `uploadUrl` 和对象 `key`。
3. 前端用 `PUT` 把文件直接上传到 `uploadUrl`。
4. 前端读取图片的宽高，和 `key` 一起提交给业务接口：
   ```json
   { "key": "prod/product/2026/11/01/abc.jpg", "width": 1080, "height": 1440 }
   ```

接口返回图片时，同时返回 `key`、可直接访问的 `url`（经 CloudFront 分发），以及 `width`、`height`（用于瀑布流排版）：

```json
{ "key": "prod/product/2026/11/01/abc.jpg", "url": "https://...", "width": 1080, "height": 1440 }
```

- 前端显示图片时**直接使用 `url`**，不要自己拼接地址。
- 数据库只保存 `key`，不保存完整地址。以后更换域名或 CDN 时，只需修改配置。

## 8. 并发与重复提交

- **状态变更**：服务器按「当前状态是否允许」判断。状态已被他人改变时，返回 `INVALID_STATUS`，前端提示并刷新页面。
- **编辑**【建议】：可能被多人同时编辑的资源（商品、配送配置），响应中带 `version` 字段，编辑时原样提交。服务器发现版本不一致时，返回 `VERSION_CONFLICT`，提示「数据已被他人修改，请刷新后重试」。
- 前端在请求进行中禁用提交按钮，防止重复点击。

## 9. 错误码

### 通用

| code | HTTP | 含义 |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | 参数校验失败，详情见 `details` |
| `NEED_LOGIN` | 401 | 未登录，或 token 失效 |
| `FORBIDDEN` | 403 | 没有权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `INVALID_STATUS` | 409 | 当前状态不允许此操作（如对已完成的订单开始配送） |
| `VERSION_CONFLICT` | 409 | 数据已被他人修改【建议】 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 管理端

| code | HTTP | 含义 | 出处 |
| --- | --- | --- | --- |
| `BAD_PASSWORD` | 401 | 账号或密码错误。**不区分是账号错还是密码错** | PRD 第 3 节 |
| `NAME_DUPLICATED` | 409 | 名称与已有数据重复（类目、城市、时段） | PRD 第 9、11、14 节 |
| `CATEGORY_IN_USE` | 409 | 类目下还有在售商品或在售帖子，不能删除 | PRD 第 9、14 节 |
| `STOCK_BELOW_LOCKED` | 409 | 账面库存不能小于已锁定的件数 | PRD 第 8 节 |
| `LAST_SLOT` | 409 | 至少要保留一个送达时段 | PRD 第 10 节 |
| `LISTING_NOT_ON_SALE` | 409 | 帖子不是在售状态，不能强制下架 | PRD 第 13 节 |
| `REFUND_PAYOUT_FAILED` | 502 | 向微信发起退款失败，退款单保持待审，可以重试【建议】 | PRD 第 6.1 节 |
| `UPLOAD_NOT_ALLOWED` | 400 | 申请上传地址时，图片类型或大小不符合要求【建议】 | — |

### 小程序端（供参考，以小程序契约为准）

`NEED_PHONE`、`BAD_PHONE`、`WECHAT_LOGIN_FAILED`、`WECHAT_UNIONID_MISSING`、`CITY_NOT_FOUND`、`PLACE_OUTSIDE`、`LAST_ADDRESS`、`ADDRESS_NOT_DELIVERABLE`、`NO_DELIVERY_AREA`、`SLOT_CLOSED`、`OUT_OF_STOCK`、`ORDER_EXPIRED`、`AFTER_SALE_CLOSED`、`ALREADY_APPLIED`、`CONTACT_BLOCKED`、`LISTING_CLOSED`、`CONTENT_BLOCKED`

### 新增错误码

需要新的错误码时，先加到本文件，再在契约中使用。不要在代码里临时发明错误码。

## 10. 契约文件的写法

- 使用 **OpenAPI 3.1**，每个端一个文件。
- 每个业务模块一个 `tag`，如 `order`、`refund`。
- 每个接口有 `operationId`，用 camelCase 的「动词 + 名词」：`listOrders`、`getOrder`、`startOrderDelivery`。前端生成的函数和类型以此命名。
- 公共结构（响应包装、分页、错误、图片、金额等）定义在 `components/schemas` 中，各模块引用，不要重复定义。
- 每个接口都写出可能返回的错误码。
- `admin.openapi.yaml` 按负责人划分区块，每人只在自己的区块内修改，见 `docs/tasks/admin-web.md` 的 W-00 系列任务。
