#!/usr/bin/env bash
# Creates labels, milestones, issues (from docs/issues/*.md) and a Project board
# for the PawTrust P2 repo using the GitHub CLI.
#
# Usage:
#   gh auth login && gh auth refresh -s project
#   REPO=owner/repo MEMBER_A=github-user-a MEMBER_B=github-user-b ./scripts/setup-github.sh issues
#   # then create the board columns in the UI (see README step), and:
#   REPO=owner/repo ./scripts/setup-github.sh board
set -euo pipefail

: "${REPO:?set REPO=owner/repo}"
OWNER="${REPO%%/*}"
SPRINT1_DUE="${SPRINT1_DUE:-2026-11-04}"
SPRINT2_DUE="${SPRINT2_DUE:-2026-11-13}"
PROJECT_TITLE="${PROJECT_TITLE:-PawTrust Scrum Board}"
ISSUE_DIR="$(dirname "$0")/../docs/issues"

# header field from an issue file, e.g. field title file.md
field() { sed -n "s/^$1: //p" "$2" | head -1; }

create_labels() {
  gh label create feature         -R "$REPO" -c 1D76DB -d "New functionality"       --force
  gh label create bug             -R "$REPO" -c D73A4A -d "Something isn't working" --force
  gh label create chore           -R "$REPO" -c BFD4F2 -d "Setup, tooling, deploy"  --force
  gh label create docs            -R "$REPO" -c 0075CA -d "Documentation"           --force
  gh label create priority:high   -R "$REPO" -c B60205 --force
  gh label create priority:medium -R "$REPO" -c FBCA04 --force
  gh label create priority:low    -R "$REPO" -c 0E8A16 --force
}

create_milestones() {
  for m in "Sprint 1|$SPRINT1_DUE|Foundation, accounts, owner task management" \
           "Sprint 2|$SPRINT2_DUE|Apply/accept/finish loop, reviews, polish"; do
    IFS='|' read -r title due desc <<<"$m"
    if ! gh api "repos/$REPO/milestones?state=all" --jq '.[].title' | grep -qx "$title"; then
      gh api "repos/$REPO/milestones" -f title="$title" -f due_on="${due}T23:59:59Z" -f description="$desc" >/dev/null
      echo "milestone: $title"
    fi
  done
}

create_issues() {
  for f in "$ISSUE_DIR"/*.md; do
    title=$(field title "$f")
    if gh issue list -R "$REPO" --state all --search "in:title \"$title\"" --json title --jq '.[].title' | grep -qxF "$title"; then
      echo "skip (exists): $title"; continue
    fi
    owner=$(field owner "$f")
    assignee=$([ "$owner" = "A" ] && echo "${MEMBER_A:-}" || echo "${MEMBER_B:-}")
    body=$(sed '1,/^---$/d' "$f")
    args=(-R "$REPO" --title "$title" --body "$body" --milestone "$(field milestone "$f")")
    IFS=',' read -ra labels <<<"$(field labels "$f")"
    for l in "${labels[@]}"; do args+=(--label "$l"); done
    [ -n "$assignee" ] && args+=(--assignee "$assignee")
    gh issue create "${args[@]}"
  done
}

create_project() {
  num=$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.title==\"$PROJECT_TITLE\") | .number")
  if [ -z "$num" ]; then
    num=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json --jq .number)
    gh project link "$num" --owner "$OWNER" --repo "$REPO"
  fi
  for url in $(gh issue list -R "$REPO" --state all --limit 100 --json url --jq '.[].url'); do
    gh project item-add "$num" --owner "$OWNER" --url "$url" >/dev/null
  done
  echo "Project #$num ready. Now set its Status options to: Backlog, Sprint Todo, In Progress, In Review, Done"
}

# Moves Sprint 1 issues to "Sprint Todo" and Sprint 2 issues to "Backlog".
assign_board() {
  num=$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.title==\"$PROJECT_TITLE\") | .number")
  pid=$(gh project view "$num" --owner "$OWNER" --format json --jq .id)
  status=$(gh project field-list "$num" --owner "$OWNER" --format json --jq '.fields[] | select(.name=="Status")')
  fid=$(jq -r .id <<<"$status")
  opt() { jq -r --arg n "$1" '.options[] | select(.name==$n) | .id' <<<"$status"; }
  todo=$(opt "Sprint Todo"); backlog=$(opt "Backlog")
  [ -n "$todo" ] && [ -n "$backlog" ] || { echo "Create 'Backlog' and 'Sprint Todo' Status options first"; exit 1; }
  gh project item-list "$num" --owner "$OWNER" --limit 100 --format json \
    --jq '.items[] | "\(.id)\t\(.milestone.title // "")"' |
  while IFS=$'\t' read -r item ms; do
    gh project item-edit --id "$item" --project-id "$pid" --field-id "$fid" \
      --single-select-option-id "$([ "$ms" = "Sprint 1" ] && echo "$todo" || echo "$backlog")" >/dev/null
  done
  echo "Board updated."
}

case "${1:-}" in
  issues) create_labels; create_milestones; create_issues; create_project ;;
  board)  assign_board ;;
  *) echo "usage: $0 issues|board"; exit 1 ;;
esac
