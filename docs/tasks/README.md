# 任务管理

我们用 **GitHub Project 看板**管理任务的状态和进度，用本目录下的文件记录任务的范围和锁定的目录。

## 信息放在哪里

| 信息 | 放在哪里 | 怎么修改 |
| --- | --- | --- |
| 任务的**状态**（待办、进行中、已完成） | GitHub Project 看板 | 在看板上**拖动卡片**；PR 合并后**自动**变为已完成 |
| 任务的**计划日期** | GitHub Project 看板的「路线图」视图 | 在路线图上**拖动横条** |
| 任务的**详细说明** | 每个任务对应的 GitHub issue | 在 issue 页面编辑 |
| 任务的**范围、依赖、负责人**一览 | `admin-web.md` 等任务清单 | 通过 PR 修改 |
| **已锁定的目录** | `locked-paths.txt` | 在完成任务的 PR 中添加 |

**第一次使用看板，请先读 `github-project-guide.md`。**

**日常增加、删除、修改任务，都在 GitHub 网页上操作**，再同步修改本目录下的任务清单。具体做法见 `github-project-guide.md` 第三部分的「维护任务」。`.github/project-setup/` 下的脚本只在第一次搭建看板、或进入新阶段批量创建任务时使用。

## 本目录的文件

| 文件 | 内容 |
| --- | --- |
| `github-project-guide.md` | GitHub Project 使用指南：概念、搭建步骤、日常操作、常见问题 |
| `admin-web.md` | 管理后台前端阶段的任务清单：成员分工、依赖图、每个任务的范围 |
| `locked-paths.txt` | 已锁定的目录，每行一个 |

以后每个阶段一份任务清单，例如 `mini.md`、`backend-admin.md`。

## 任务 ID

每个任务有一个 ID，由阶段前缀加编号组成：

| 前缀 | 阶段 |
| --- | --- |
| `W` | 管理后台前端 |
| `M` | 小程序前端 |
| `BA` | 管理端后端 |
| `BM` | 小程序后端 |

任务 ID 写在 issue 标题的开头，如 `[W-02] 城市（示例模块）`。任务清单、issue、PR 里都用这个 ID 互相对照。

## 一个任务的完整流程

```text
① 在看板上找到自己的任务，确认依赖已完成
② 把卡片拖到 In Progress
③ 从 develop 拉分支，开发（只改任务范围内的文件）
④ 提 PR，描述里写 Closes #issue编号
   └─ 这是完成任务的 PR 时，同时把范围内的目录加入 locked-paths.txt
⑤ 审查通过、合并
⑥ 任务自动变为 Done，目录进入锁定
```

## 锁定

任务完成后，它范围内的目录**默认不允许修改**，防止 AI 或其他人在做别的任务时，顺手改动已经完成并审查过的代码。

### 怎么锁定

在完成任务的那个 PR 中，把任务范围内的路径逐行加入 `locked-paths.txt`，例如：

```text
frontend/web/src/views/city/
frontend/web/src/api/city.ts
frontend/web/src/mocks/handlers/city.ts
frontend/web/src/mocks/data/city.ts
```

### 锁定如何生效

| 层 | 作用 |
| --- | --- |
| `AGENTS.md` 中的规则 | 提醒所有 AI：修改锁定目录前，必须先停下来询问 |
| Claude Code 钩子 | 直接阻止 Claude Code 编辑锁定目录中的文件 |
| CI 检查（W-01e 完成后生效） | PR 修改了锁定目录、却没有 `unlock` 标签时，禁止合并 |

### 需要修改已锁定的模块时

1. 和该模块的负责人沟通：改什么、为什么改。
2. 负责人同意后，在 PR 上添加 `unlock` 标签。
3. 使用 Claude Code 时，启动前临时解锁对应目录：
   ```bash
   PICKAUS_UNLOCK="frontend/web/src/views/city/" claude
   ```
   多个目录用冒号分隔。
4. 由该模块的负责人审批 PR。

修改完成后，目录仍然保持锁定，不需要从 `locked-paths.txt` 中移除。
