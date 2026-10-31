# backend/admin · 管理端后端规则（精简版）

本文件是 `` 工程的规则，在仓库根目录 `AGENTS.md` 的基础上补充。两者冲突时，以根目录为准。

> **当前状态：尚未开始。** 本工程在小程序前端之后开发。本文件只包含已确定的核心规则，开工前会补全。
> 在此之前，**不要在本工程中创建任何代码文件**。

## 工程概述

拾澳管理后台的后端，为 `../../frontend/web` 提供接口。

- **需求**：`docs/prd/admin-prd.md`
- **接口**：按 `docs/api/admin.openapi.yaml` 实现，契约是前后端唯一的约定
- **模块路径**：`github.com/MoonLight-QAQ/HowToBuildBigMuscle/backend/admin`（大小写必须完全一致）

## 技术栈

| 用途 | 选型 |
| --- | --- |
| 语言 | Go（版本以 `go.mod` 为准） |
| Web 框架 | Gin |
| ORM | GORM |
| 数据库 | MySQL 8.0+ |
| 缓存 | Redis，客户端 go-redis v9 |
| 配置 | Viper |
| 日志 | Zap |

## 分层

调用方向固定为 `router → controller → service → dao`，只能向下调用，不能反向或跨层。

| 层 | 负责 | 不能做 |
| --- | --- | --- |
| controller | 绑定和校验参数、调用 service、把结果转换为响应 DTO | 写业务规则、直接访问数据库 |
| service | 业务规则、状态流转、事务边界 | 处理 HTTP 细节 |
| dao | 读写 MySQL 和 Redis | 写业务判断 |

- 数据库实体（`model`）和接口出入参（`dto`）分开定义。DTO 只在 controller 层出现。
- 本工程是完全独立的工程， **不能引用 `../mini` 或其他工程的任何代码**。

## Go 编码约定

本团队成员以前写 Java，以下几点和 Java 习惯不同，务必遵守：

1. **错误用返回值，不用 panic。** 每个可能失败的调用都检查 `err`；向上传递时用 `fmt.Errorf("...: %w", err)` 包装，保留原始错误。
2. **`context.Context` 作为每个 service 和 dao 方法的第一个参数**，用于传递请求范围的信息和超时控制。
3. **依赖通过构造函数注入**，命名为 `NewXxx`，在启动时手动组装。不使用全局变量保存依赖。
4. **业务代码中不把函数作为参数传递**，统一用结构体加方法组织。框架要求的场景除外，如 Gin 中间件、GORM 的事务闭包。

## 数据库硬规则

1. **不使用数据库锁。** 禁止 `SELECT ... FOR UPDATE`、`LOCK TABLES`。
2. **状态变更用带旧状态条件的 UPDATE**，如 `UPDATE ... SET status = ? WHERE id = ? AND status = ?`，然后检查影响行数。影响行数为 0，说明状态已被他人改变，返回业务错误。
3. **并发修改用乐观锁**：表中带 `version` 字段，更新时 `WHERE version = ?` 并让 `version + 1`。
4. **金额用 `int64`，单位为分。** 禁止使用 `float64` 表示金额。
5. 每张表都有 `id`（`bigint unsigned`，雪花 ID）、`gmt_create`、`gmt_modified`、`is_deleted`。不使用外键。
6. **表结构变更必须向后兼容**，并同时提供回退脚本。例如要删除字段，先停止使用，两个版本之后再删。
7. 查询时显式列出字段，不使用 `SELECT *`。

## Redis 硬规则

1. **每个 key 都必须设置过期时间**，过期时间 = 基础时间 + 随机时间，防止大量 key 同时失效（缓存雪崩）。
2. 查询结果为空时，也缓存一个短时间的空值，防止反复查询不存在的数据（缓存穿透）。
3. key 命名格式：`pickaus:<业务>:<标识>`。
4. 禁止使用 `KEYS` 命令，遍历用 `SCAN`。

## 本工程特有的规则

1. **管理端不能接触用户的联系方式。** 禁止查询 `user_contacts` 表，查询 `contact_requests` 时不能包含号码字段。
2. 管理员的 JWT 中 `aud` 为 `admin`，签名密钥与顾客端分开。
