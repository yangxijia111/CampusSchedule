#!/usr/bin/env bash
# 网络恢复后一键推送剩余分支并创建 PR（P1/P2 六个提交，堆叠在 main @ a6170d3 之上）。
# 用法：bash scripts/push-pending-prs.sh
# 推送后按顺序执行：merge PR → 下一个（GitHub UI 或 gh pr merge --squash）。
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCHES=(
  feat/semester-switch-calendar-editor
  feat/backup-restore
  fix/overlap-layout
  feat/mobile-daily-timetable
  fix/pwa-subpath-deployment
  feat/import-resilience
)

for branch in "${BRANCHES[@]}"; do
  echo "==> push $branch"
  git push -u origin "$branch"
done

echo
echo "全部分支已推送。请按以下顺序创建并 squash-merge PR（每个 PR 以前一个的合并为基础）："
echo "  1. feat/semester-switch-calendar-editor  -> PR 标题: feat: add active semester switching, calendar editor and period times editor  (Refs #5)"
echo "  2. feat/backup-restore                   -> PR 标题: feat: restore application backup                                            (Refs #5)"
echo "  3. fix/overlap-layout                    -> PR 标题: fix: layout partially overlapping courses                                 (Refs #6)"
echo "  4. feat/mobile-daily-timetable           -> PR 标题: feat: add mobile daily timetable                                           (Refs #6)"
echo "  5. fix/pwa-subpath-deployment            -> PR 标题: fix: support pwa subpath deployment                                        (Closes #7)"
echo "  6. feat/import-resilience                -> PR 标题: feat: harden import flow and align copy with real features                (Closes #8)"
echo
echo "合并完成后：git checkout main && git pull && 更新 Tracking Issue #1 勾选状态。"
