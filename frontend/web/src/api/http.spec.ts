// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { delay } from 'msw'
import { http as mockHttp, HttpResponse, type HttpResponseResolver } from 'msw/http'
import { setupServer } from 'msw/node'
import { ApiError, HttpClient } from './http'

const baseURL = 'http://localhost:48123/api/admin'
const fixtureURL = `${baseURL}/__test`
const server = setupServer()
let generation = 1
let needLoginCalls = 0
let passwordChangeCalls = 0
let authThrows = false
let client: HttpClient

const auth = {
  /** 中文：读取测试会话代次，无副作用。 English: Returns the current test session generation. */
  getSessionGeneration(): number {
    return generation
  },
  /** 中文：记录失效通知，可模拟适配器失败。 English: Counts notifications; may throw a test error. */
  onNeedLogin(): void {
    needLoginCalls += 1
    if (authThrows) throw new Error('test-auth-adapter-failed')
  },
  /** 中文：记录改密码通知，可模拟适配器失败。 English: Counts notifications; may throw a test error. */
  onPasswordChangeRequired(): void {
    passwordChangeCalls += 1
    if (authThrows) throw new Error('test-auth-adapter-failed')
  },
}

/** 中文：读取原始测试数据，不转换。 English: Returns unknown fixture data without side effects. */
function parseData(data: unknown): unknown {
  return data
}

/** 中文：校验字符串 ID 和整数分，失败抛错。 English: Parses a record or throws for invalid data. */
function parseRecord(data: unknown): { id: string; totalCents: number } {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('invalid-record')
  }
  const record = data as Record<string, unknown>
  if (typeof record.id !== 'string' || !Number.isSafeInteger(record.totalCents)) {
    throw new Error('invalid-record')
  }
  return { id: record.id, totalCents: record.totalCents as number }
}

/** 中文：创建 JSON 响应工厂，不访问网络。 English: Returns a resolver for the supplied body/status. */
function respondWith(body: unknown, status = 200): HttpResponseResolver {
  /** 中文：返回给定 JSON，不修改状态。 English: Resolves a fixture response without side effects. */
  function resolveFixture(): Response {
    return new HttpResponse(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return resolveFixture
}

/** 中文：启动拦截，未知请求报错。 English: Starts isolated network interception; no external traffic. */
function startServer(): void {
  server.listen({ onUnhandledFrame: 'error' })
}

/** 中文：每例创建独立客户端并重置认证状态。 English: Resets test state and creates a fresh client. */
function resetClient(): void {
  generation = 1
  needLoginCalls = 0
  passwordChangeCalls = 0
  authThrows = false
  client = new HttpClient({ baseURL, timeoutMs: 1000, auth })
}

/** 中文：清理临时拦截规则。 English: Removes per-test handlers after each assertion. */
function resetServer(): void {
  server.resetHandlers()
}

/** 中文：恢复网络实现。 English: Stops interception after the suite. */
function stopServer(): void {
  server.close()
}

beforeAll(startServer)
beforeEach(resetClient)
afterEach(resetServer)
afterAll(stopServer)

/** 中文：验证拆包且不损失 ID/金额。 English: Asserts unwrapping preserves string IDs and integer cents. */
it('拆出成功 data，保留大整数 ID 字符串及整数分', async function testUnwrapRecord() {
  const record = { id: '1854239876543209472', totalCents: 3900 }
  server.use(mockHttp.get(fixtureURL, respondWith({ ok: true, data: record })))
  await expect(client.request('/__test', { parse: parseRecord })).resolves.toEqual(record)
})

/** 中文：验证空数组与空值不混淆。 English: Asserts array and null payloads remain distinct. */
it.each([[], null])('成功 data 保留 %j', async function testEmptyData(data) {
  server.use(mockHttp.get(fixtureURL, respondWith({ ok: true, data })))
  await expect(client.request('/__test', { parse: parseData })).resolves.toEqual(data)
})

/** 中文：验证参数进入请求且不带认证头。 English: Asserts query serialization without an Authorization header. */
it('发送查询参数，不转换 ID，不带 Authorization', async function testRequestMetadata() {
  /** 中文：回显已观察的请求参数。 English: Returns request metadata solely for this test. */
  function echoMetadata({ request }: Parameters<HttpResponseResolver>[0]): Response {
    const url = new URL(request.url)
    return HttpResponse.json({
      ok: true,
      data: {
        authorization: request.headers.get('authorization'),
        query: url.searchParams.toString(),
      },
    })
  }
  server.use(mockHttp.get(fixtureURL, echoMetadata))
  await expect(
    client.request('/__test', {
      params: { id: '1854239876543209472', page: 1, enabled: false },
      parse: parseData,
    }),
  ).resolves.toEqual({
    authorization: null,
    query: 'id=1854239876543209472&page=1&enabled=false',
  })
})

/** 中文：匿名和未接入认证也不带认证头。 English: Anonymous or unconfigured clients omit Authorization too. */
it.each(['anonymous', 'unconfigured'])(
  '请求 %s 时不带认证',
  async function testNoAuthorization(mode) {
    /** 中文：回显认证头。 English: Returns the observed authorization header. */
    function echoAuthorization({ request }: Parameters<HttpResponseResolver>[0]): Response {
      return HttpResponse.json({
        ok: true,
        data: { authorization: request.headers.get('authorization') },
      })
    }
    server.use(mockHttp.get(fixtureURL, echoAuthorization))
    if (mode === 'unconfigured') client.setAuth(null)
    await expect(
      client.request('/__test', { anonymous: mode === 'anonymous', parse: parseData }),
    ).resolves.toEqual({ authorization: null })
  },
)

/** 中文：会话代次读取失败须在发送前安全终止。 English: Generation-reader failure rejects safely before dispatch. */
it('首次读取会话代次异常归一化为 protocol，且不发送请求或携带原错误', async function testFailingGenerationRead() {
  let requests = 0
  /** 中文：记录是否错误发网。 English: Counts dispatches and returns a fixture if unexpectedly reached. */
  function countRequests(): Response {
    requests += 1
    return HttpResponse.json({ ok: true, data: {} })
  }
  server.use(mockHttp.get(fixtureURL, countRequests))
  client.setAuth({
    ...auth,
    /** 中文：模拟代次读取异常。 English: Throws synthetic sensitive context instead of a generation. */
    getSessionGeneration(): number {
      throw new Error('private-session-reader-marker')
    },
  })
  try {
    await client.request('/__test', { parse: parseData })
    expect.unreachable('应在发出请求前拒绝认证适配器异常')
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'protocol', code: null, status: null })
    expect((error as Error).message).not.toContain('private-session-reader-marker')
    expect(error).not.toHaveProperty('cause')
    expect(JSON.stringify(error)).not.toContain('private-session-reader-marker')
  }
  expect(requests).toBe(0)
  expect(needLoginCalls).toBe(0)
})

/** 中文：验证写入 JSON 与拆包。 English: Asserts POST sends JSON and returns decoded data. */
it('POST 发送 JSON 并返回响应 data', async function testPostJson() {
  /** 中文：回显请求体，只有测试计数变化。 English: Echoes JSON without a production write. */
  async function echoBody({ request }: Parameters<HttpResponseResolver>[0]): Promise<Response> {
    expect(request.headers.get('content-type')).toContain('application/json')
    return HttpResponse.json({ ok: true, data: await request.json() })
  }
  server.use(mockHttp.post(fixtureURL, echoBody))
  const input = { id: '1854239876543209472', version: 0 }
  await expect(
    client.request('/__test', { method: 'POST', data: input, parse: parseData }),
  ).resolves.toEqual(input)
})

/** 中文：200 不等于业务成功。 English: Asserts a valid failure envelope rejects even over HTTP 200. */
it('HTTP 200 的业务失败仍抛出错误', async function testBusinessFailureOver200() {
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith({ ok: false, code: 'INVALID_STATUS', message: '测试状态已变化' }),
    ),
  )
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'business',
    code: 'INVALID_STATUS',
    status: 200,
  })
})

/** 中文：保留业务错误码及字段详情。 English: Asserts typed business errors preserve contract details. */
it('业务失败保留 code、HTTP 状态与字段 details', async function testBusinessDetails() {
  const details = [{ field: 'nameZh', message: '不能为空' }]
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith({ ok: false, code: 'VALIDATION_FAILED', message: '参数失败', details }, 400),
    ),
  )
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'business',
    code: 'VALIDATION_FAILED',
    status: 400,
    details,
  })
})

/** 中文：未知大写错误码可供未来调用方判断。 English: Preserves an unknown valid code with a safe message. */
it('保留未来业务错误码，同时不直接显示服务器未知文案', async function testUnknownCode() {
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith({ ok: false, code: 'FUTURE_RULE', message: 'sensitive-server-context' }, 409),
    ),
  )
  try {
    await client.request('/__test', { parse: parseData })
    expect.unreachable('应拒绝业务失败')
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'business', code: 'FUTURE_RULE' })
    expect((error as Error).message).not.toContain('sensitive-server-context')
  }
})

/** 中文：登录密码错误不触发失效流程。 English: BAD_PASSWORD remains a business error without logout. */
it('BAD_PASSWORD 即使 HTTP 401 也不触发登录失效', async function testBadPassword() {
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith({ ok: false, code: 'BAD_PASSWORD', message: '账号或密码错误' }, 401),
    ),
  )
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    code: 'BAD_PASSWORD',
  })
  expect(needLoginCalls).toBe(0)
})

/** 中文：同一会话代次的重复失效只通知一次。 English: Repeated NEED_LOGIN errors notify once per generation. */
it('NEED_LOGIN 对同一会话代次去重通知', async function testNeedLoginDeduplication() {
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith({ ok: false, code: 'NEED_LOGIN', message: '登录已失效' }, 401),
    ),
  )
  const results = await Promise.allSettled([
    client.request('/__test', { parse: parseData }),
    client.request('/__test', { parse: parseData }),
  ])
  expect(results).toMatchObject([
    { status: 'rejected', reason: { code: 'NEED_LOGIN' } },
    { status: 'rejected', reason: { code: 'NEED_LOGIN' } },
  ])
  expect(needLoginCalls).toBe(1)
  generation += 1
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    code: 'NEED_LOGIN',
  })
  expect(needLoginCalls).toBe(2)
})

/** 中文：匿名请求不清除现有会话。 English: Anonymous NEED_LOGIN errors do not notify the session adapter. */
it('匿名请求的 NEED_LOGIN 不影响已登录会话', async function testAnonymousNeedLogin() {
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith({ ok: false, code: 'NEED_LOGIN', message: '匿名请求失败' }, 401),
    ),
  )
  await expect(
    client.request('/__test', { anonymous: true, parse: parseData }),
  ).rejects.toMatchObject({ code: 'NEED_LOGIN' })
  expect(needLoginCalls).toBe(0)
})

/** 中文：旧请求失败不得清理新会话。 English: A stale response must not invalidate a newer session. */
it('旧会话的 NEED_LOGIN 不影响请求期间建立的新会话', async function testStaleSession() {
  /** 中文：收到旧请求时模拟会话轮换，再返回失败。 English: Bumps the generation before a stale response. */
  function staleFailure(): Response {
    generation += 1
    return HttpResponse.json(
      { ok: false, code: 'NEED_LOGIN', message: '旧会话失败' },
      { status: 401 },
    )
  }
  server.use(mockHttp.get(fixtureURL, staleFailure))
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    code: 'NEED_LOGIN',
  })
  expect(needLoginCalls).toBe(0)
})

/** 中文：认证适配器失败不掩盖请求失败。 English: Adapter exceptions must not replace the ApiError. */
it('登录失效回调异常不掩盖原业务错误', async function testFailingAuthAdapter() {
  authThrows = true
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith({ ok: false, code: 'NEED_LOGIN', message: '登录已失效' }, 401),
    ),
  )
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'business',
    code: 'NEED_LOGIN',
  })
})

/** 中文：须改密码时通知适配器一次。 English: PASSWORD_CHANGE_REQUIRED notifies the adapter. */
it('PASSWORD_CHANGE_REQUIRED 通知适配器跳转改密码页，并保留原业务错误', async function testPasswordChangeRequired() {
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith(
        { ok: false, code: 'PASSWORD_CHANGE_REQUIRED', message: '请先修改初始密码' },
        403,
      ),
    ),
  )
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'business',
    code: 'PASSWORD_CHANGE_REQUIRED',
  })
  expect(passwordChangeCalls).toBe(1)
  expect(needLoginCalls).toBe(0)
})

/** 中文：匿名请求不触发改密码跳转。 English: Anonymous requests do not notify. */
it('匿名请求的 PASSWORD_CHANGE_REQUIRED 不通知适配器', async function testAnonymousPasswordChange() {
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith(
        { ok: false, code: 'PASSWORD_CHANGE_REQUIRED', message: '请先修改初始密码' },
        403,
      ),
    ),
  )
  await expect(
    client.request('/__test', { anonymous: true, parse: parseData }),
  ).rejects.toMatchObject({ code: 'PASSWORD_CHANGE_REQUIRED' })
  expect(passwordChangeCalls).toBe(0)
})

/** 中文：改密码回调异常不掩盖请求失败。 English: Adapter exceptions must not replace the ApiError. */
it('改密码回调异常不掩盖原业务错误', async function testFailingPasswordChangeAdapter() {
  authThrows = true
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith(
        { ok: false, code: 'PASSWORD_CHANGE_REQUIRED', message: '请先修改初始密码' },
        403,
      ),
    ),
  )
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'business',
    code: 'PASSWORD_CHANGE_REQUIRED',
  })
})

/** 中文：认证回检失败也保留业务失败。 English: Session recheck failures must preserve NEED_LOGIN. */
it('登录失效时会话代次回检异常仍保留原业务错误', async function testFailingGenerationRecheck() {
  let reads = 0
  client.setAuth({
    ...auth,
    /** 中文：首读给出代次，回检模拟失败。 English: Returns a generation once, then throws on recheck. */
    getSessionGeneration(): number {
      reads += 1
      if (reads > 1) throw new Error('test-session-reader-failed')
      return 1
    },
  })
  server.use(
    mockHttp.get(
      fixtureURL,
      respondWith({ ok: false, code: 'NEED_LOGIN', message: '登录已失效' }, 401),
    ),
  )
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'business',
    code: 'NEED_LOGIN',
  })
})

/** 中文：拒绝成功包装的结构错误。 English: Malformed envelopes reject before business decoding. */
it.each([
  {},
  { ok: true },
  { ok: 'true', data: {} },
  { ok: true, data: 42 },
  { ok: true, data: 'not-an-object' },
  { ok: false, code: 'INVALID_STATUS' },
])('拒绝不符合包装约定的响应 %j', async function testMalformedEnvelope(body) {
  server.use(mockHttp.get(fixtureURL, respondWith(body)))
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'protocol',
  })
})

/** 中文：拒绝 JSON 损坏和 HTML 假成功。 English: Invalid JSON or HTML cannot become a successful payload. */
it.each(['{broken-json', '<html>proxy page</html>'])(
  '拒绝非 JSON 成功响应 %s',
  async function testNonJson(body) {
    /** 中文：返回损坏的内容。 English: Returns raw content to exercise protocol validation. */
    function rawResponse(): Response {
      return new HttpResponse(body, { headers: { 'Content-Type': 'application/json' } })
    }
    server.use(mockHttp.get(fixtureURL, rawResponse))
    await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
      kind: 'protocol',
    })
  },
)

/** 中文：仅 JSON 文本不代表正确媒体类型。 English: JSON-looking text/plain still violates the response contract. */
it('HTTP 200 text/plain 即使正文是合法成功 JSON 也拒绝', async function testWrongContentType() {
  /** 中文：返回错误媒体类型的成功文本。 English: Returns valid JSON with an invalid response media type. */
  function textResponse(): Response {
    return new HttpResponse(JSON.stringify({ ok: true, data: {} }), {
      headers: { 'Content-Type': 'text/plain' },
    })
  }
  server.use(mockHttp.get(fixtureURL, textResponse))
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'protocol',
    code: null,
    status: 200,
  })
})

/** 中文：领域解析失败统一归一化。 English: Domain decoder failures become safe protocol errors. */
it('领域数据校验失败时不把原始响应交给视图', async function testDecoderFailure() {
  server.use(
    mockHttp.get(fixtureURL, respondWith({ ok: true, data: { id: 185423987, totalCents: 3.9 } })),
  )
  await expect(client.request('/__test', { parse: parseRecord })).rejects.toMatchObject({
    kind: 'protocol',
  })
})

/** 中文：错误 HTTP 即使成功包装也拒绝。 English: Non-success HTTP status cannot return successful data. */
it('HTTP 409 上的成功包装不当作业务成功', async function testSuccessOnErrorHttp() {
  server.use(mockHttp.get(fixtureURL, respondWith({ ok: true, data: {} }, 409)))
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'http',
    status: 409,
  })
})

/** 中文：网关错误不泄露原始响应。 English: Proxy failures become HTTP errors without raw internals. */
it('HTML 网关错误保留 HTTP 状态且不携带原始配置或响应', async function testProxyFailure() {
  /** 中文：模拟网关 HTML。 English: Returns a gateway failure without a contract envelope. */
  function gatewayFailure(): Response {
    return new HttpResponse('<html>private-proxy-context</html>', { status: 502 })
  }
  server.use(mockHttp.get(fixtureURL, gatewayFailure))
  try {
    await client.request('/__test', { parse: parseData })
    expect.unreachable('应拒绝 HTTP 失败')
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 502 })
    expect(error).not.toHaveProperty('config')
    expect(error).not.toHaveProperty('response')
    expect(error).not.toHaveProperty('cause')
    expect((error as Error).message).not.toContain('private-proxy-context')
    expect(JSON.stringify(error)).not.toContain('mock-token')
  }
})

/** 中文：断网有独立类型。 English: Transport failure is distinguished from business and HTTP failures. */
it('网络失败归一化为 network', async function testNetworkFailure() {
  /** 中文：模拟传输失败。 English: Produces a network error without external traffic. */
  function networkFailure(): Response {
    return HttpResponse.error()
  }
  server.use(mockHttp.get(fixtureURL, networkFailure))
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'network',
    code: null,
    status: null,
  })
})

/** 中文：超时与取消分开。 English: A delayed response rejects with timeout, not cancellation. */
it('超时归一化为 timeout', async function testTimeout() {
  /** 中文：延迟固定测试响应。 English: Delays a response to trigger the configured request timeout. */
  async function delayedResponse(): Promise<Response> {
    await delay(100)
    return HttpResponse.json({ ok: true, data: {} })
  }
  server.use(mockHttp.get(fixtureURL, delayedResponse))
  client = new HttpClient({ baseURL, timeoutMs: 10 })
  await expect(client.request('/__test', { parse: parseData })).rejects.toMatchObject({
    kind: 'timeout',
    code: null,
  })
})

/** 中文：预先取消不发出请求。 English: An already-aborted signal rejects without hitting the handler. */
it('已取消的请求归一化为 canceled 且不发送', async function testPreAbortedRequest() {
  let requests = 0
  /** 中文：记录请求次数。 English: Counts intercepted requests and returns a fixture. */
  function countRequests(): Response {
    requests += 1
    return HttpResponse.json({ ok: true, data: {} })
  }
  server.use(mockHttp.get(fixtureURL, countRequests))
  const controller = new AbortController()
  controller.abort()
  await expect(
    client.request('/__test', { signal: controller.signal, parse: parseData }),
  ).rejects.toMatchObject({ kind: 'canceled' })
  expect(requests).toBe(0)
})

/** 中文：请求途中取消也归一化。 English: Abort during an intercepted request returns cancellation. */
it('支持请求中的 AbortSignal 取消', async function testAbortInFlight() {
  const controller = new AbortController()
  /** 中文：在服务器收到请求后取消。 English: Aborts after interception confirms the request started. */
  async function abortResponse(): Promise<Response> {
    controller.abort()
    await delay(10)
    return HttpResponse.json({ ok: true, data: {} })
  }
  server.use(mockHttp.get(fixtureURL, abortResponse))
  await expect(
    client.request('/__test', { signal: controller.signal, parse: parseData }),
  ).rejects.toMatchObject({ kind: 'canceled' })
})

/** 中文：写请求失败不可自动重复执行。 English: A failed POST is sent exactly once. */
it('写请求失败不自动重试', async function testNoWriteRetry() {
  let writes = 0
  /** 中文：计数并返回失败。 English: Counts a simulated write and returns a server error. */
  function failedWrite(): Response {
    writes += 1
    return HttpResponse.json(
      { ok: false, code: 'INTERNAL_ERROR', message: '暂不可用' },
      { status: 500 },
    )
  }
  server.use(mockHttp.post(fixtureURL, failedWrite))
  await expect(
    client.request('/__test', { method: 'POST', data: {}, parse: parseData }),
  ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' })
  expect(writes).toBe(1)
})

/** 中文：越界地址不得携带认证出网。 English: Rejects unsafe paths before sending an authenticated request. */
it.each([
  'https://example.com/leak',
  '//example.com/leak',
  '/\\example.com/leak',
  '/../outside',
  '/%2e%2e/outside',
])('请求前拒绝越界地址 %s', async function testUnsafePath(path) {
  await expect(client.request(path, { parse: parseData })).rejects.toMatchObject({
    kind: 'protocol',
  })
})
