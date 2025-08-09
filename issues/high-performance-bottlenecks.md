# HIGH: Performance Bottlenecks in Data Subscriptions

## Severity: HIGH

## Issue Description

The application has several performance bottlenecks related to inefficient data fetching and processing patterns.

### 1. Inefficient NDK Subscriptions

**Location**: 
- `src/hooks/useProjectsWithStatus.ts` - Fetches ALL status events in last 10 minutes
- `src/components/chat/ThreadList.tsx` - Subscribes to ALL chat events for project
- `src/components/chat/ChatInterface.tsx` - Recreates entire message array on every update

**Problem**: Fetching large volumes of data and performing expensive client-side filtering/sorting operations.

### 2. Missing Virtualization

**Location**:
- `src/components/chat/ChatInterface.tsx` - Not using VirtualList for messages
- `src/components/chat/ThreadList.tsx` - Renders all threads regardless of visibility
- `src/components/tasks/TasksTabContent.tsx` - Renders all tasks at once

**Problem**: Rendering large lists without virtualization causes poor scrolling performance and high memory usage.

### 3. Unbounded Cache Growth

**Location**: `src/lib/ndk-setup.ts`

**Problem**: NDKCacheDexie has no explicit eviction policy, leading to ever-growing local database.

## Impact

- Poor performance with large datasets
- High memory consumption
- Janky scrolling and UI interactions
- Potential browser crashes on low-end devices
- Degraded user experience as data grows

## Recommended Solution

### Immediate Improvements
1. Implement virtualization for all large lists using existing VirtualList component
2. Add pagination or limit clauses to NDK subscriptions
3. Implement debouncing for expensive operations

### Long-term Solution
1. Implement server-side filtering and pagination
2. Add cache eviction policies (TTL, max size)
3. Use React.memo and useMemo more aggressively
4. Consider implementing infinite scroll patterns
5. Profile and optimize render performance

## Risk Level
While not a security issue, these performance problems will severely impact user experience as the application scales, potentially making it unusable for active users with large amounts of data.