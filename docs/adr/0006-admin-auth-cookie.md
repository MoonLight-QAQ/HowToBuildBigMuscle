# 0006. 管理端鉴权改用 httpOnly cookie

- 状态：已采纳
- 日期：2026-11-12
- 决策人：@celine-hy

## 背景

原契约（W-00d）中，管理端登录接口返回 `token`，前端保存后放在请求头 `Authorization: Bearer <token>` 中。W-01c 把它存在浏览器的 localStorage 里。

这样做有两个问题：

- **XSS 能直接偷走通行证。** 页面上只要有一处脚本注入，攻击者就能读出 localStorage 里的 token，在自己的电脑上继续使用，直到它过期。
- **作废不了已经发出的 token。** 契约里没有登出接口，也没有服务器端会话。改密码、员工离开之后，旧 token 仍然可用。

管理后台能审退款、改价改库存、下架帖子，是整个系统里权限最大的入口。团队整理了[管理端基础安全方案（初创版）](https://claude.ai/artifact/8SsJQCMkiEa5szRGHiJDuj)，原则是：挡住最常见的攻击，需要额外功能或月费的部分先暂缓。

## 决策

1. **通行证放在同域的 httpOnly cookie 中**：`__Host-pickaus_admin`，属性为 `HttpOnly; Secure; SameSite=Strict; Path=/`。登录响应只返回 `expiresAt` 和 `admin`，不返回通行证。前端读不到 cookie，通过 `GET /me` 判断是否已登录。
2. **防 CSRF**：`SameSite=Strict` 为主，非 GET 请求另外检查 `Origin` 请求头，不是后台自己的域名就返回 `FORBIDDEN`。
3. **服务器端会话。** 通行证在服务器上有记录，最长 30 天（写在配置里）。新增 `POST /logout` 作废当前通行证；改密码、停用账号时作废该账号的所有通行证。
4. **登录限流。** 同一账号加同一 IP，15 分钟内失败 5 次就暂时锁定，返回 `TOO_MANY_ATTEMPTS`（429），并带 `Retry-After`。账号不存在时也计数，并照样做一次密码哈希，避免从响应时间判断账号是否存在。
5. **首次登录必须改密码。** `Admin` 增加 `mustChangePassword`。为 `true` 时，除 `/login`、`/logout`、`/me`、`/password` 外都返回 `PASSWORD_CHANGE_REQUIRED`（403）。新增 `POST /password`，需要旧密码；新密码至少 12 位、不能是常见密码，否则返回 `WEAK_PASSWORD`。
6. **第一版不分角色。** 所有账号都是管理员，后端只检查「是否为已登录的管理员」。权限不足沿用现有的 `FORBIDDEN`。

接口细节见 `docs/api/conventions.md` 第 4 节和 `docs/api/admin.openapi.yaml`。

## 考虑过的其他方案

| 方案 | 结论 |
| --- | --- |
| 保持 Bearer token，存在 localStorage | XSS 时通行证会被直接偷走；仍然需要另做登出和作废。工作量和 cookie 方案差不多，安全性更差 |
| Bearer token 只存在内存里，刷新页面时用 refresh cookie 换新的 | 多一套刷新流程和接口，对一个只有几个账号的后台来说太复杂 |
| JWT，不做服务器端会话 | 无法作废已发出的通行证，登出和改密码都无效 |
| 后台加 IP 白名单 | 合伙人需要在店外登录，不采用 |

## 后果

好处：

- 前端代码拿不到通行证，XSS 偷不走它（但仍能在页面内冒用身份，所以前端依然不用 `v-html`）。
- 登出、改密码、停用账号能立即生效。

代价和约束：

- **前端与接口必须同域。** 开发环境需要在 Vite 中配置代理；生产环境由同一个域名提供页面和接口。
- **本地联调要注意 `Secure`。** Chrome、Firefox 把 `http://localhost` 视为安全来源，接受这个 cookie；Safari 不一定接受，联调时用前两者或本地 HTTPS。现在前端用模拟数据开发，不受影响。
- **小程序不能共用这套做法。** 小程序没有浏览器 cookie，仍使用请求头中的 token，以小程序契约为准。
- **前端需要跟着改。** 请求层去掉 `Authorization` 请求头；登录状态不再保存在 localStorage，改为启动时调用 `/me`；退出调用 `/logout`；新增改密码页 `/change-password`。这些在后续任务中完成。
- 后端需要一张会话表。表中预留 `last_seen_at` 字段，以后加闲置失效时不必改表。

## 暂缓的部分

以下内容等出现对应情况时再补，见安全方案中的「什么时候升级到完整方案」：

- 角色与权限（加 `Admin.role` 属于加字段，不影响现有接口）
- 两步验证（TOTP）、闲置失效、「记住这台设备」、登录中设备列表与远程登出、敏感操作再验证
- 「只看账号」「只看 IP」的限流计数、限流计数放到 Redis
- 严格的 CSP 策略
