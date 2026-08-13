#!/usr/bin/env bash
# Cursor CLI status line — reads StatusLinePayload JSON on stdin.
# Spec: https://code.claude.com/docs/en/statusline
set -u

input=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  printf '\033[90mstatusline: jq is required\033[0m\n'
  exit 0
fi

model=$(echo "$input" | jq -r '.model.display_name // "model"')
param=$(echo "$input" | jq -r '.model.param_summary // empty')
max_mode=$(echo "$input" | jq -r '.model.max_mode // false')
dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
pct_raw=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
autorun=$(echo "$input" | jq -r '.autorun // false')
session=$(echo "$input" | jq -r '.session_name // empty')
vim_mode=$(echo "$input" | jq -r '.vim.mode // empty')
worktree=$(echo "$input" | jq -r '.worktree.name // empty')
version=$(echo "$input" | jq -r '.version // empty')

pct=${pct_raw%%.*}
[[ "$pct" =~ ^[0-9]+$ ]] || pct=0
(( pct > 100 )) && pct=100
(( pct < 0 )) && pct=0

bar_width=12
filled=$((pct * bar_width / 100))
empty=$((bar_width - filled))
bar=""
if (( filled > 0 )); then
  printf -v fill "%${filled}s"
  bar="${fill// /━}"
fi
if (( empty > 0 )); then
  printf -v pad "%${empty}s"
  bar="${bar}${pad// /─}"
fi

if (( pct >= 85 )); then
  ctx_color='\033[31m'
elif (( pct >= 60 )); then
  ctx_color='\033[33m'
else
  ctx_color='\033[32m'
fi

folder="${dir##*/}"
[[ -z "$folder" ]] && folder="~"

branch=""
if [[ -n "$dir" ]] && git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git -C "$dir" branch --show-current 2>/dev/null || true)
  if [[ -z "$branch" ]]; then
    branch=$(git -C "$dir" rev-parse --short HEAD 2>/dev/null || true)
  fi
  if [[ -n "$(git -C "$dir" status --porcelain 2>/dev/null)" ]]; then
    branch="${branch}*"
  fi
fi

dim='\033[90m'
cyan='\033[36m'
blue='\033[34m'
green='\033[32m'
magenta='\033[35m'
yellow='\033[33m'
reset='\033[0m'
bold='\033[1m'

line1="${bold}${cyan}${model}${reset}"
[[ -n "$param" ]] && line1+=" ${dim}${param}${reset}"
[[ "$max_mode" == "true" ]] && line1+=" ${yellow}MAX${reset}"
line1+="  ${blue}${folder}${reset}"
[[ -n "$branch" ]] && line1+="  ${green}${branch}${reset}"
[[ -n "$worktree" ]] && line1+="  ${magenta}wt:${worktree}${reset}"
[[ -n "$session" ]] && line1+="  ${dim}${session}${reset}"
[[ -n "$vim_mode" ]] && line1+="  ${yellow}${vim_mode}${reset}"
[[ "$autorun" == "true" ]] && line1+="  ${green}autorun${reset}"

line2="${ctx_color}${bar}${reset} ${ctx_color}${pct}%${reset}${dim} ctx${reset}"
[[ -n "$version" ]] && line2+="  ${dim}v${version}${reset}"

printf '%b\n%b\n' "$line1" "$line2"
