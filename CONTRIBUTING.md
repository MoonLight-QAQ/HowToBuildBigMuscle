# 拾澳 PickAus · 协作指南

本文件写给团队成员，说明如何配置本地环境、日常如何开发和提交、如何发版和处理线上问题。

AI 需要遵守的规则写在 `AGENTS.md` 中。两份文件内容一致，本文件更侧重操作步骤。

**新成员请按顺序阅读：**

1. 本文件的「一、本地环境配置」，完成一次性配置。
2. 根目录 `AGENTS.md`，了解仓库结构和硬规则。
3. 你负责的工程目录下的 `AGENTS.md`。
4. `docs/tasks/` 下的任务清单，找到分配给你的任务。

---

## 一、本地环境配置（每人一次）

### 1. 安装工具

| 工具 | 用途 | 何时需要 |
| --- | --- | --- |
| Git | 版本管理 | 现在 |
| GitHub CLI（`gh`） | 在终端创建 PR、执行仓库设置脚本 | 现在 |
| Node.js（LTS 版本） | 前端运行环境 | 现在 |
| pnpm | 前端包管理 | 现在 |
| lefthook | 提交前的本地检查 | 现在 |
| GoLand 或 VS Code | 编辑器 | 现在 |
| Claude Code 或 Codex | AI 编码工具，二选一 | 现在 |
| Go | 后端运行环境 | 后端开工时 |
| Docker Desktop | 本地运行 MySQL 和 Redis | 后端开工时 |
| 微信开发者工具 | 小程序预览和调试 | 小程序开工时 |

macOS 可以用 Homebrew 安装：

```bash
brew install git gh node pnpm lefthook
```

### 2. 配置 Git 提交身份

GitHub 根据提交中的**邮箱**识别是谁的提交。邮箱必须已添加到你 GitHub 账号的 **Settings → Emails** 中。

仓库是公开的，提交记录中的姓名和邮箱任何人都能看到。不想公开真实邮箱时，使用 **Settings → Emails** 页面上显示的 noreply 邮箱。

如果你电脑上还有其他账号（如学校账号），可以按目录自动切换身份：

```bash
# 个人项目使用的身份
cat > ~/.gitconfig-personal <<'EOF'
[user]
	name = 你的名字或昵称
	email = 你的邮箱
EOF

# GolandProjects 目录下的仓库自动使用上面的身份
git config --global includeIf."gitdir/i:~/GolandProjects/".path ~/.gitconfig-personal
```

在仓库目录中执行 `git config --show-origin user.email`，确认显示的是正确的邮箱。

### 3. 登录 GitHub CLI

```bash
gh auth login       # 选择 GitHub.com → HTTPS → Login with a web browser
gh auth setup-git   # 让 git 推送时使用 gh 的登录凭证
```

### 4. 其他全局配置

```bash
# 自动清除已在远程删除的分支记录
git config --global fetch.prune true

# macOS 用户：全局忽略 .DS_Store
echo ".DS_Store" >> ~/.gitignore_global
git config --global core.excludesfile ~/.gitignore_global
```

### 5. 克隆仓库并启用本地检查

```bash
git clone https://github.com/MoonLight-QAQ/HowToBuildBigMuscle.git
cd HowToBuildBigMuscle
lefthook install
```

`lefthook install` **必须执行**。它会在每次提交前自动检查：是否在 `develop` 或 `main` 上提交、是否包含密钥或系统文件、代码格式和 lint 是否通过。

### 6. 配置 AI 编码工具

**使用 Claude Code：**

1. 安装 Claude Code，在终端执行 `claude`，按提示登录。
2. GoLand 中安装插件 **Claude Code [Beta]**，然后**完全退出并重新打开** GoLand。
3. 在 GoLand 的终端中，从**仓库根目录**启动 `claude`，输入 `/config`，把 diff tool 设为 `auto`。
4. 按 `Shift + Tab` 切换到 **manual** 模式，让每次修改都先经过你确认。
5. **不要执行 `/init`**，仓库已有维护好的规则文件。

**使用 Codex：** 安装后在仓库根目录启动即可，它会自动读取 `AGENTS.md`。

### 7. 开启 GitHub 两步验证

在 GitHub 的 **Settings → Password and authentication** 中开启。仓库是公开的，账号被盗的后果更严重。

---

## 二、日常开发流程

以「城市管理」任务为例，一个任务从开始到合并：

### 1. 领任务

在 `docs/tasks/` 的任务清单中找到分配给你的任务，记下**任务 ID** 和**范围**。

### 2. 从最新的 develop 拉分支

```bash
git checkout develop
git pull
git checkout -b feat/fe-web-city
```

分支命名格式为 `类型/范围-简短描述`，见 `AGENTS.md`。

### 3. 用 AI 开发

1. 从仓库根目录启动 `claude`。
2. 切换到 **plan** 模式，说明任务，例如：
   > 完成任务 W-01 城市管理。需求见 docs/prd/admin-prd.md 的城市一节，原型见 docs/prototype/admin。
3. 审阅 AI 给出的计划：改哪些文件、是否在任务范围内、是否需要先改接口契约。有问题直接指出，确认后再切回 manual 模式执行。
4. 每处改动都在 GoLand 的对比窗口中确认。

### 4. 自查

1. 在工程目录下运行检查命令（如前端的 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`），全部通过。
2. 在 GoLand 的 **Commit** 面板中，从头到尾看一遍所有改动。**看不懂的代码不提交**，先让 AI 解释清楚。
3. 在 Claude Code 中执行 `/pr-checklist`，逐项检查。

### 5. 提交并推送

```bash
git add <改动的文件>
git commit -m "feat(fe-web): 城市管理页面"
git push -u origin feat/fe-web-city
```

本地的提交信息可以写得随意一些，最终进入 develop 的是 PR 标题。

### 6. 创建 PR

```bash
gh pr create --base develop
```

- **目标分支必须是 `develop`。**
- 标题格式：`类型(范围): 中文描述`，如 `feat(fe-web): 城市管理页面`。
- 按 PR 模板填写描述。

### 7. 审查与合并

- 至少 1 人审批后才能合并。所有审查意见都处理完（Resolve），才能合并。
- 收到审查意见后，在同一个分支上修改并推送，PR 会自动更新。新的提交会让之前的审批失效，需要重新审批。
- 审批通过后，点 **Squash and merge**。

### 8. 合并后清理

```bash
git checkout develop
git pull
git branch -D feat/fe-web-city
```

远程分支在合并时会被自动删除。**合并后的分支不要再使用**，下一个任务从最新的 develop 拉新分支。

---

## 三、审查别人的 PR

### 时效

**收到审查请求后，当天给出意见。** 3 个人的团队，PR 等待审查是最大的效率瓶颈。

### 怎么审

1. 打开 PR 的 **Files changed** 标签逐个查看。也可以在 Claude Code 中使用 `/code-review`，让 AI 先审一遍，再由你确认。
2. 重点检查：
   - 改动是否只在任务范围内，有没有动到共享区域或已锁定的目录
   - 是否遵守接口契约
   - 金额、ID、时间的处理是否符合约定
   - 有没有提交不该提交的文件
3. 有问题就在对应代码行上留评论。没有问题就点 **Review changes → Approve**。

### 管理员跳过审批

仓库管理员可以不等审批直接合并自己的 PR。**只用于仓库设置、文档和线上紧急修复。业务代码必须由他人审查。**

---

## 四、任务清单与锁定

### 状态

| 状态 | 含义 |
| --- | --- |
| ⬜ 待办 | 还没开始 |
| 🚧 进行中 | 已有人在做 |
| ✅ 已完成 🔒 | 已合并，目录已锁定 |

### 操作

- **开始任务：** 在你的第一个 PR 中，把清单里这个任务的状态改为「进行中」。
- **完成任务：** 在完成功能的 PR 中，把状态改为「已完成 🔒」，填上 PR 编号，并把该任务的目录加入 `docs/tasks/locked-paths.txt`。
- **每个 PR 只修改自己任务的那一行**，避免多人同时修改清单时冲突。

### 修改已锁定的模块

1. 先和该模块的负责人沟通，说明要改什么、为什么改。
2. 负责人同意后，在 PR 上添加 `unlock` 标签。
3. 由该模块的负责人审批。

没有 `unlock` 标签时，CI 会阻止合并修改了锁定目录的 PR。

---

## 五、接口契约

前后端以 `docs/api/` 下的接口契约为唯一约定：

- 需要新接口或新字段时，**先改契约**，再改代码。
- 修改契约会影响其他成员和后端。改之前在团队里说一声，契约的改动在 PR 描述中单独列出。
- 前端在后端完成之前，使用按契约编写的模拟数据开发。

---

## 六、发版

### 时机

不需要每合并一个 PR 就发版。在 develop 上积累一批功能，在测试环境验证通过后，统一发版，例如每周一次。

### 步骤

1. 创建 develop 到 main 的 PR：
   ```bash
   gh pr create --base main --head develop --title "release: 2026-11-08"
   ```
2. 审批后，点 **Create a merge commit** 合并（main 只允许这种方式）。
3. 由管理员在 main 上为需要发布的工程分别打 tag：
   ```bash
   git checkout main && git pull
   git tag fe-web/v0.1.0
   git push origin fe-web/v0.1.0
   ```

tag 格式为 `范围/v主版本.次版本.修订号`。只有管理员能创建发布 tag。

---

## 七、线上紧急修复（hotfix）

1. 从 main 拉分支：
   ```bash
   git checkout main && git pull
   git checkout -b hotfix/fe-web-order-amount
   ```
2. 修复、自查后，创建目标为 **main** 的 PR：`gh pr create --base main`。
3. 合并后打 tag 发布。
4. **立即把 main 同步回 develop：**
   ```bash
   git checkout -b chore/sync-hotfix origin/main
   git push -u origin chore/sync-hotfix
   gh pr create --base develop --title "chore(repo): 同步 hotfix 到 develop"
   ```
   这一步不能漏，否则下次发版时会冲突，或者修复被覆盖。

---

## 八、回滚

| 情况 | 做法 |
| --- | --- |
| 某个 PR 合进 develop 后发现问题 | 打开那个 PR，点页面底部的 **Revert**，GitHub 会自动创建一个撤销它的 PR，审查后合并 |
| 生产环境出问题 | 先把生产环境重新部署为**上一个 tag**，恢复服务；再按 hotfix 流程修复 |
| 需要找回已删除的分支 | 打开对应的 PR，点页面底部的 **Restore branch** |

**数据库无法随代码一起回滚。** 表结构变更必须向后兼容，并提供回退脚本，见后端工程的 `AGENTS.md`。

---

## 九、与 AI 协作的约定

1. **你对 AI 写的每一行代码负责。** 提交前必须看过、理解过。审查时被问到「这段在做什么」，要能说清楚。
2. **一个会话只做一个任务。** 切换任务前执行 `/clear`，再切换分支。
3. **需要同时推进两个任务时，用 git worktree**，为第二个分支开一个独立的工作目录：
   ```bash
   git worktree add ../HowToBuildBigMuscle-task2 -b feat/fe-web-xxx develop
   ```
4. **AI 反复犯同一类错误时，补充规则。** 把规则加到对应的 `AGENTS.md` 中，通过 PR 提交，让所有人的 AI 都能受益。
5. **不要把密钥、密码、用户数据粘贴给 AI。**

---

## 十、常见问题

**推送时提示 `Changes must be made through a pull request`**

你在 `develop` 或 `main` 上直接提交了。把提交挪到新分支：

```bash
git checkout -b feat/xxx                    # 新分支会带上这次提交
git branch -f develop origin/develop        # 把本地 develop 恢复成远程的状态
```

**`git pull` 时提示 `no such ref was fetched`**

这个分支的 PR 已经合并，远程分支已被自动删除。切回 develop 即可：`git checkout develop && git pull`。

**提交时被 lefthook 拦截**

按提示修复问题后重新提交。不要使用 `--no-verify` 跳过检查。

**PR 的目标分支选错了**

在 PR 页面点标题旁的 **Edit**，把目标分支改为正确的分支。

**清理所有已合并的本地分支**

```bash
git fetch --prune
git for-each-ref --format '%(refname:short) %(upstream:track)' refs/heads \
  | awk '$2=="[gone]" {print $1}' \
  | xargs git branch -D
```

**检查 develop 和 main 的内容是否一致**

```bash
git diff --stat origin/develop origin/main
```

没有输出表示内容一致。不要用 `git log` 比较，main 上的合并提交总会让它有输出。
