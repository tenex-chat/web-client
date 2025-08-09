#!/bin/bash

# Fix unused imports by removing them
echo "Fixing unused imports..."

# Remove unused imports from ThreadList.tsx
sed -i '' '/^import.*NDKEvent.*from.*@nostr-dev-kit\/ndk/d' src/components/chat/ThreadList.tsx
sed -i '' 's/, Clock//g' src/components/chat/ThreadList.tsx

# Remove unused imports from CollapsibleProjectsSidebar.tsx
sed -i '' 's/, ChevronLeft//g' src/components/layout/CollapsibleProjectsSidebar.tsx
sed -i '' '/^import.*cn.*from/d' src/components/layout/CollapsibleProjectsSidebar.tsx
sed -i '' '/^import.*ProjectCard.*from/d' src/components/layout/CollapsibleProjectsSidebar.tsx

# Remove unused imports from MCPToolsPage.tsx
sed -i '' 's/import { useState, useEffect }/import { useState }/' src/components/mcp/MCPToolsPage.tsx

# Remove unused imports from SettingsPage.tsx
sed -i '' 's/, Mic//g' src/components/pages/SettingsPage.tsx
sed -i '' 's/, Volume2//g' src/components/pages/SettingsPage.tsx
sed -i '' 's/, Palette//g' src/components/pages/SettingsPage.tsx
sed -i '' 's/, Bell//g' src/components/pages/SettingsPage.tsx

# Remove unused imports from various files
sed -i '' 's/, useRef//g' src/hooks/useMentionAutocomplete.ts
sed -i '' '/^import.*atom.*from.*jotai/d' src/hooks/useDraftPersistence.ts

echo "Fixed unused imports!"

# Fix type issues
echo "Fixing type issues..."

# Fix NDKKind assignments (4199 and 4200 are custom kinds)
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/kind: 4199/kind: 4199 as NDKKind/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/kind: 4200/kind: 4200 as NDKKind/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/kinds: \[4199\]/kinds: [4199 as NDKKind]/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/kinds: \[4200\]/kinds: [4200 as NDKKind]/g'

echo "Done fixing TypeScript errors!"