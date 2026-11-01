#!/usr/bin/env python3
"""
拾澳 · 一键创建 GitHub Project 看板和任务 issue

这个脚本会做 6 件事：
  1. 检查 GitHub CLI 是否已登录，并且有操作 Project 的权限
  2. 创建任务要用到的标签（task、unlock 等）
  3. 创建 Project 看板，并关联到本仓库
  4. 在看板上创建自定义字段：开始日期、截止日期、估算天数
  5. 按 tasks-admin-web.json 为每个任务创建一个 issue，分配负责人，加入看板
  6. 为新创建的任务填好状态（Todo）、开始日期、截止日期、估算天数

用法（在仓库根目录执行）：
  python3 .github/project-setup/setup_project.py            # 正式执行
  python3 .github/project-setup/setup_project.py --dry-run  # 只打印要做什么，不做任何修改
  python3 .github/project-setup/setup_project.py --refill W-00a,W-00b
      # 为指定的已有任务重新填写状态、日期和估算（用于补救上次中途失败时漏填的任务）

可以重复执行：
  - 已经存在的标签、看板、字段、issue，不会重复创建
  - 已经存在的 issue，不会修改它在看板上的状态和日期（以免覆盖你在网页上做的调整）

详细说明见同目录下的 README.md。
"""

import json
import pathlib
import subprocess
import sys

# ============================================================
# 配置：一般不需要修改
# ============================================================

OWNER = "MoonLight-QAQ"                       # 仓库所有者（个人账号）
REPO = "MoonLight-QAQ/HowToBuildBigMuscle"    # 仓库
PROJECT_TITLE = "拾澳 · 管理后台前端"           # 看板名称
TASK_FILE = pathlib.Path(__file__).with_name("tasks-admin-web.json")

# 标签：名称、颜色、说明
LABELS = [
    ("task",      "1D76DB", "开发任务（会自动加入看板）"),
    ("admin-web", "0E8A16", "管理后台前端阶段"),
    ("contract",  "5319E7", "接口契约"),
    ("skeleton",  "FBCA04", "工程骨架与共享区域"),
    ("module",    "C2E0C6", "业务模块"),
    ("unlock",    "D93F0B", "本 PR 需要修改已锁定的目录，已获负责人同意"),
]

# 看板上的自定义字段：名称、类型
CUSTOM_FIELDS = [
    ("开始日期", "DATE"),
    ("截止日期", "DATE"),
    ("估算天数", "NUMBER"),
]

# 看板自带的「Status」字段中，新任务的初始状态
INITIAL_STATUS = "Todo"

# 任务类型对应的中文名称
AREA_NAMES = {"contract": "接口契约", "skeleton": "工程骨架", "module": "业务模块"}

DRY_RUN = "--dry-run" in sys.argv


def parse_refill():
    """读取 --refill 参数，返回需要重新填写字段的任务 ID 集合。"""
    if "--refill" not in sys.argv:
        return set()
    index = sys.argv.index("--refill")
    if index + 1 >= len(sys.argv):
        print("❌ --refill 后面需要跟任务 ID，用逗号分隔，例如：--refill W-00a,W-00b")
        sys.exit(1)
    return {item.strip() for item in sys.argv[index + 1].split(",") if item.strip()}


REFILL_IDS = parse_refill()


# ============================================================
# 工具函数
# ============================================================

def log(message: str) -> None:
    print(message, flush=True)


def gh(*args, input_text=None, mutates=False):
    """调用 GitHub CLI，返回输出。mutates=True 表示这个命令会修改数据，dry-run 时只打印不执行。"""
    if DRY_RUN and mutates:
        log(f"    [dry-run] gh {' '.join(args)}")
        return ""
    result = subprocess.run(
        ["gh", *args],
        input=input_text,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        log(f"\n❌ 命令执行失败：gh {' '.join(args)}")
        log(result.stderr.strip() or result.stdout.strip())
        sys.exit(1)
    return result.stdout.strip()


def gh_json(*args, mutates=False):
    """调用 GitHub CLI 并把输出解析为 JSON。"""
    output = gh(*args, mutates=mutates)
    return json.loads(output) if output else {}


# ============================================================
# 第 1 步：检查登录和权限
# ============================================================

def check_auth() -> None:
    log("\n[1/6] 检查 GitHub CLI 的登录状态、权限，以及负责人能否被分配")
    result = subprocess.run(["gh", "auth", "status"], capture_output=True, text=True)
    status = result.stdout + result.stderr
    if result.returncode != 0:
        log("❌ 还没有登录 GitHub CLI。请先执行：gh auth login")
        sys.exit(1)
    if "'project'" not in status:
        log("❌ 当前登录缺少操作 Project 的权限。请执行下面这条命令补充权限，然后重新运行本脚本：")
        log("   gh auth refresh -s project")
        sys.exit(1)
    log("  ✓ 已登录，且有 Project 权限")

    # 提前检查每位负责人能否被分配到本仓库的 issue。
    # 在创建任何 issue 之前检查，避免执行到一半才失败。
    tasks = json.loads(TASK_FILE.read_text(encoding="utf-8"))["tasks"]
    assignees = sorted({t["assignee"] for t in tasks if t["assignee"]})
    not_assignable = []
    for login in assignees:
        check = subprocess.run(["gh", "api", f"repos/{REPO}/assignees/{login}", "--silent"],
                               capture_output=True, text=True)
        if check.returncode == 0:
            log(f"  ✓ 可以分配任务给 @{login}")
        else:
            not_assignable.append(login)
    if not_assignable:
        log("\n❌ 以下成员还不能被分配任务：" + "、".join("@" + x for x in not_assignable))
        log("   通常是因为对方还不是仓库的协作者，或者还没有接受协作邀请。")
        log("   处理方法见 .github/project-setup/README.md 的「常见问题」。处理好后重新运行本脚本。")
        sys.exit(1)


# ============================================================
# 第 2 步：标签
# ============================================================

def ensure_labels() -> None:
    log("\n[2/6] 创建标签")
    for name, color, description in LABELS:
        # --force：标签已存在时更新颜色和说明，不会报错
        gh("label", "create", name, "--color", color, "--description", description,
           "--force", "--repo", REPO, mutates=True)
        log(f"  ✓ {name}：{description}")


# ============================================================
# 第 3 步：看板
# ============================================================

def ensure_project() -> dict:
    log("\n[3/6] 创建看板")
    projects = gh_json("project", "list", "--owner", OWNER, "--format", "json", "--limit", "100")
    for project in projects.get("projects", []):
        if project["title"] == PROJECT_TITLE:
            log(f"  ✓ 看板已存在：{project['url']}")
            return project

    if DRY_RUN:
        log(f"    [dry-run] 将创建看板「{PROJECT_TITLE}」")
        return {"number": 0, "id": "DRY_RUN_PROJECT", "url": "(dry-run)"}

    project = gh_json("project", "create", "--owner", OWNER, "--title", PROJECT_TITLE,
                      "--format", "json", mutates=True)
    # 把看板关联到仓库，这样在仓库的 Projects 标签页里也能看到它
    subprocess.run(["gh", "project", "link", str(project["number"]),
                    "--owner", OWNER, "--repo", REPO], capture_output=True, text=True)
    log(f"  ✓ 已创建看板：{project['url']}")
    return project


# ============================================================
# 第 4 步：自定义字段
# ============================================================

def ensure_fields(project: dict) -> dict:
    """返回 {字段名: 字段信息}，包括看板自带的 Status 字段。"""
    log("\n[4/6] 创建看板字段")
    if DRY_RUN and project["number"] == 0:
        for name, data_type in CUSTOM_FIELDS:
            log(f"    [dry-run] 将创建字段「{name}」（{data_type}）")
        return {}

    def list_fields() -> dict:
        data = gh_json("project", "field-list", str(project["number"]),
                       "--owner", OWNER, "--format", "json", "--limit", "100")
        return {field["name"]: field for field in data.get("fields", [])}

    fields = list_fields()
    for name, data_type in CUSTOM_FIELDS:
        if name in fields:
            log(f"  ✓ 字段已存在：{name}")
            continue
        gh("project", "field-create", str(project["number"]), "--owner", OWNER,
           "--name", name, "--data-type", data_type, mutates=True)
        log(f"  ✓ 已创建字段：{name}")

    return list_fields()


# ============================================================
# 第 5、6 步：任务 issue
# ============================================================

def build_issue_body(task: dict) -> str:
    """生成 issue 的描述。所有任务使用统一的格式，方便阅读，也方便 AI 读取。"""
    depends = "、".join(task["depends"]) if task["depends"] else "无，可以直接开始"
    assignee = f"@{task['assignee']}" if task["assignee"] else "待分配"
    # 纯路径用代码格式显示；带中文说明的（如「契约中 A 的区块」）按普通文字显示
    scope = "\n".join(f"- `{path}`" if path.isascii() else f"- {path}" for path in task["scope"])
    refs = "\n".join(f"- {ref}" for ref in task["refs"])

    return f"""## 任务内容

{task['content']}

## 范围

**只能修改以下文件和目录。** 需要改动范围以外的文件时，先和相关负责人沟通。

{scope}

## 依赖

开始前需要先完成：{depends}

## 负责人

{assignee}

## 参考

{refs}

## 完成标准

- [ ] 功能符合 PRD 和原型
- [ ] 遵守根目录和对应工程的 `AGENTS.md`
- [ ] 对应工程的 lint、类型检查、测试、构建全部通过
- [ ] 完成任务的 PR 中，把上面「范围」里的目录加入 `docs/tasks/locked-paths.txt`
- [ ] PR 描述里写上 `Closes #本 issue 编号`，合并后本任务会自动移到「Done」

---

任务类型：{AREA_NAMES[task['area']]}　｜　估算：{task['estimateDays']} 天　｜　计划：{task['start']} 至 {task['end']}
"""


def find_existing_issues() -> dict:
    """返回 {任务 ID: issue}。通过标题开头的 [W-xx] 识别。"""
    data = gh_json("issue", "list", "--repo", REPO, "--label", "task", "--state", "all",
                   "--limit", "500", "--json", "number,title,url")
    existing = {}
    for issue in data if isinstance(data, list) else []:
        title = issue["title"]
        if title.startswith("[") and "]" in title:
            existing[title[1:title.index("]")]] = issue
    return existing


def set_item_fields(project: dict, fields: dict, item_id: str, task: dict) -> None:
    """为新加入看板的任务填写状态、日期和估算。"""
    def edit(field_name: str, *value_args: str) -> None:
        if field_name not in fields:
            return
        gh("project", "item-edit", "--id", item_id, "--project-id", project["id"],
           "--field-id", fields[field_name]["id"], *value_args, mutates=True)

    status = fields.get("Status")
    if status:
        option = next((o for o in status.get("options", []) if o["name"] == INITIAL_STATUS), None)
        if option:
            edit("Status", "--single-select-option-id", option["id"])
    edit("开始日期", "--date", task["start"])
    edit("截止日期", "--date", task["end"])
    edit("估算天数", "--number", str(task["estimateDays"]))


def ensure_issues(project: dict, fields: dict) -> list:
    log("\n[5/6] 创建任务 issue，加入看板，并填写状态、日期和估算")
    tasks = json.loads(TASK_FILE.read_text(encoding="utf-8"))["tasks"]
    existing = find_existing_issues() if not DRY_RUN else {}
    results = []

    for task in tasks:
        title = f"[{task['id']}] {task['title']}"
        is_new = task["id"] not in existing

        if is_new:
            args = ["issue", "create", "--repo", REPO, "--title", title, "--body-file", "-",
                    "--label", "task", "--label", "admin-web", "--label", task["area"]]
            if task["assignee"]:
                args += ["--assignee", task["assignee"]]
            url = gh(*args, input_text=build_issue_body(task), mutates=True) or "(dry-run)"
            log(f"  ✓ 已创建：{title}")
        else:
            url = existing[task["id"]]["url"]
            log(f"  · 已存在，跳过：{title}")

        # 加入看板（已在看板上时不会重复添加）
        item_id = None
        if not DRY_RUN:
            item = gh_json("project", "item-add", str(project["number"]), "--owner", OWNER,
                           "--url", url, "--format", "json", mutates=True)
            item_id = item.get("id")

        # 新任务，或用 --refill 指定的任务：立即填写状态、日期和估算。
        # 每个任务创建后马上填写，这样即使脚本中途失败，已创建的任务也不会缺字段。
        should_fill = is_new or task["id"] in REFILL_IDS
        if should_fill and item_id:
            set_item_fields(project, fields, item_id, task)
            log(f"      已填写：{INITIAL_STATUS}，{task['start']} 至 {task['end']}，估算 {task['estimateDays']} 天")
        elif should_fill and DRY_RUN:
            log(f"    [dry-run] 将填写：{INITIAL_STATUS}，{task['start']} 至 {task['end']}")

        results.append((task, url, item_id, is_new))

    unknown = REFILL_IDS - {t["id"] for t in tasks}
    if unknown:
        log("  ! --refill 中这些任务 ID 不存在，已忽略：" + "、".join(sorted(unknown)))

    return results


# ============================================================
# 主流程
# ============================================================

def main() -> None:
    log("=" * 60)
    log(f"  拾澳 · 创建 GitHub Project 看板{'（dry-run，不会做任何修改）' if DRY_RUN else ''}")
    log(f"  仓库：{REPO}")
    log("=" * 60)

    check_auth()
    ensure_labels()
    project = ensure_project()
    fields = ensure_fields(project)
    results = ensure_issues(project, fields)
    log("\n[6/6] 检查结果")
    created = sum(1 for *_, is_new in results if is_new)
    log(f"  ✓ 本次新建 {created} 个任务，跳过已存在的 {len(results) - created} 个")

    log("\n" + "=" * 60)
    log("  完成")
    log("=" * 60)
    log(f"\n看板地址：{project['url']}\n")
    log("任务列表：")
    for task, url, _, _ in results:
        owner = f"@{task['assignee']}" if task["assignee"] else "待分配"
        log(f"  {task['id']:<6} {owner:<15} {url}")
    log("\n下一步：按 docs/tasks/github-project-guide.md 的「第二部分」，")
    log("在网页上创建看板视图、路线图视图，并检查自动化规则。")


if __name__ == "__main__":
    main()
