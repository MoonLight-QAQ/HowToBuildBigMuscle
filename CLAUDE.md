@AGENTS.md

## 仅对 Claude Code 生效的补充

- 涉及多个文件的任务，先切换到 plan 模式（Shift + Tab）给出计划，用户确认后再切回执行。
- skill 可以直接用斜杠调用，如 `/pr-checklist`、`/new-module`。
- 不要执行 `/init`。本仓库的规则文件由团队维护，`/init` 生成的内容会与之冲突。
- 一个会话只做一个任务。切换任务前，提醒用户执行 `/clear` 并切换到对应分支。
