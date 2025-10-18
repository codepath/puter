#!/bin/bash

# Script to copy issues from upstream repository to your fork
# Usage: ./copy_issues.sh

UPSTREAM_REPO="codepath/puter"
FORK_REPO="IntermediaDesigns/puter"

echo "Copying issues from $UPSTREAM_REPO to $FORK_REPO..."

# Get all open issues from upstream
gh issue list --repo "$UPSTREAM_REPO" --state open --json number,title,body,labels --limit 100 > upstream_issues.json

# Get all existing issues from fork (to avoid duplicates)
gh issue list --repo "$FORK_REPO" --state all --json title --limit 1000 > fork_issues.json

# Extract existing titles for comparison
jq -r '.[].title' fork_issues.json > existing_titles.txt

echo "Found $(jq length fork_issues.json) existing issues in fork"
echo "Found $(jq length upstream_issues.json) issues in upstream"

created_count=0
skipped_count=0

# Read each issue and create it in the fork if it doesn't exist
jq -r '.[] | @base64' upstream_issues.json | while read -r issue; do
    # Decode the base64 encoded issue
    issue_data=$(echo "$issue" | base64 --decode)
    
    # Extract issue details
    title=$(echo "$issue_data" | jq -r '.title')
    body=$(echo "$issue_data" | jq -r '.body // ""')
    labels=$(echo "$issue_data" | jq -r '.labels[]?.name // empty' | tr '\n' ',' | sed 's/,$//')
    
    # Check if issue with same title already exists
    if grep -Fxq "$title" existing_titles.txt; then
        echo "⏭️  Skipping existing issue: $title"
        skipped_count=$((skipped_count + 1))
    else
        echo "✅ Creating new issue: $title"
        
        # Create the issue in your fork
        if [ -n "$labels" ]; then
            gh issue create --repo "$FORK_REPO" --title "$title" --body "$body" --label "$labels"
        else
            gh issue create --repo "$FORK_REPO" --title "$title" --body "$body"
        fi
        
        created_count=$((created_count + 1))
        
        # Add a small delay to avoid rate limiting
        sleep 1
    fi
done

# Clean up temporary files
rm upstream_issues.json fork_issues.json existing_titles.txt

echo "✨ Issue copying complete!"
echo "📊 Summary:"
echo "   - Created: $created_count new issues"
echo "   - Skipped: $skipped_count existing issues"
