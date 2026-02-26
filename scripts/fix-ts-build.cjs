#!/usr/bin/env node
/**
 * Apply TypeScript/build fixes so `npm run build` passes.
 * Run from project root: node scripts/fix-ts-build.cjs
 * Example on server: cd /var/www/installops-frontend && node scripts/fix-ts-build.cjs
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();

function edit(file, ...replacements) {
  const filePath = path.join(root, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (replacements.length === 1 && typeof replacements[0] === 'function') {
    content = replacements[0](content);
  } else {
    for (let i = 0; i < replacements.length; i += 2) {
      const from = replacements[i];
      const to = replacements[i + 1];
      if (typeof to === 'function') {
        content = to(content);
      } else if (from && (typeof from === 'string' ? content.includes(from) : from.test(content))) {
        content = content.replace(from, to);
      }
    }
  }
  fs.writeFileSync(filePath, content);
}

// ---------------------------------------------------------------------------
// Config (string-based to support tsconfig with comments)
// ---------------------------------------------------------------------------
const tsconfigPath = path.join(root, 'tsconfig.app.json');
let tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
if (!tsconfigContent.includes('"baseUrl"')) {
  tsconfigContent = tsconfigContent.replace(
    '"skipLibCheck": true',
    '"skipLibCheck": true,\n    "baseUrl": ".",\n    "paths": { "@/*": ["src/*"] }'
  );
  fs.writeFileSync(tsconfigPath, tsconfigContent);
}

const vitePath = path.join(root, 'vite.config.ts');
let vite = fs.readFileSync(vitePath, 'utf8');
if (!vite.includes("alias: { '@': path.resolve")) {
  vite = vite.replace(
    "import { defineConfig } from 'vite'",
    "import path from 'path'\nimport { defineConfig } from 'vite'"
  );
  vite = vite.replace(
    'export default defineConfig({\n  plugins: [react()],',
    "export default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: { '@': path.resolve(__dirname, './src') },\n  },"
  );
  fs.writeFileSync(vitePath, vite);
}

// ---------------------------------------------------------------------------
// Source files
// ---------------------------------------------------------------------------
edit('src/App-debug.tsx',
  "import React from 'react';\nimport", "import");

edit('src/App-simple.tsx',
  "import React from 'react';\n\nfunction", "function");

edit('src/App.tsx',
  /const cornerToSide: Record<DevtoolsCorner[^}]+\};\s*\n\nfunction App/g,
  'function App');

edit('src/App.tsx',
  /const getDefaultRoute = \(\) => \{[^}]+\}[^}]*\};\s*\n\n  return \(/s,
  '  return (');

edit('src/components/ErrorBoundary.tsx',
  "import React, { Component, ErrorInfo, ReactNode } from 'react'",
  "import { Component, type ErrorInfo, type ReactNode } from 'react'");

edit('src/dev/DevControls.tsx',
  "import type { UserRole } from '@/types'",
  "import type { UserRole } from '../types'");

edit('src/dev/DevControls.tsx',
  'import { GripVertical, Settings2, ChevronDown',
  'import { GripVertical, ChevronDown');

edit('src/dev/mockAuth.ts',
  "import type { User, UserRole } from '@/types'",
  "import type { User, UserRole } from '../types'");

edit('src/hooks/use-api.ts',
  (c) => c.replace(/onSuccess: \(data,/g, 'onSuccess: (_data,'));

edit('src/lib/api.ts',
  "const headers: HeadersInit = {",
  "const headers: Record<string, string> = {");

edit('src/lib/api.ts',
  '...options.headers,',
  '...(options.headers as Record<string, string>),');

edit('src/lib/api.ts',
  "const response = await this.request('/auth/login',",
  "const response = await this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/login',");

edit('src/lib/api.ts',
  "const response = await this.request('/auth/refresh',",
  "const response = await this.request<{ access_token: string; refresh_token: string }>('/auth/refresh',");

edit('src/lib/utils.ts',
  'let timeout: NodeJS.Timeout;',
  'let timeout: ReturnType<typeof setTimeout>;');

edit('src/types/index.ts',
  "| 'cancelled';",
  "| 'cancelled'\n  | 'after_sale_service'\n  | 'scheduled'\n  | 'canceled';");

edit('src/stores/auth.ts',
  /  WAREHOUSE_MANAGER: \[[^\]]+\],\s*\n  CREW:/s,
  '  CREW:');

edit('src/stores/auth-simple.ts',
  'login: async (email: string, password: string)',
  'login: async (email: string, _password: string)');

edit('src/stores/auth-simple.ts',
  (c) => {
    const block = `const mappedUser: User =\n      state.user ??\n      {\n        id: me.id,\n        name: state.user?.name ?? '',\n        email: state.user?.email ?? '',\n        phone: state.user?.phone,\n        role: (me.role?.toUpperCase?.() || 'ADMIN') as UserRole,\n        store_id: state.user?.store_id,\n        status: state.user?.status ?? 'active',\n        created_at: state.user?.created_at ?? new Date().toISOString(),\n        updated_at: new Date().toISOString(),\n      };`;
    const fixed = `const prev = state.user;\n    const mappedUser: User =\n      prev ??\n      {\n        id: me.id,\n        name: '',\n        email: '',\n        phone: undefined,\n        role: (me.role?.toUpperCase?.() || 'ADMIN') as UserRole,\n        store_id: undefined,\n        status: 'active',\n        created_at: new Date().toISOString(),\n        updated_at: new Date().toISOString(),\n      };`;
    return c.replace(block, fixed);
  });

edit('src/stores/offline.ts',
  "import { OfflineAction } from '../types'",
  "import type { OfflineAction } from '../types'");

edit('src/stores/offline.ts',
  (c) => c.replace(/\s*const failedActions = actions\.filter\(\(action\) => action\.status === 'failed'\);\s*\n/, '\n'));

edit('src/stores/offline.ts',
  'await apiClient.completeMediaUpload(installation_id, payload);',
  'await apiClient.completeMediaUpload(installation_id, payload as { files: Array<{ name: string; url: string; sha256: string; tags: any }> });');

edit('src/stores/offline.ts',
  'await apiClient.failInstallation(installation_id, payload);',
  'await apiClient.failInstallation(installation_id, payload as { reason_code: string; notes?: string });');

edit('src/pages/admin/AdminDashboard.tsx',
  "type PeriodKey = 'weekly' | 'monthly';\n\ntype PeriodMetrics",
  'type PeriodMetrics');

edit('src/pages/admin/AdminDashboard.tsx',
  (c) => {
    if (!c.includes("import type { JSX } from 'react'")) {
      return c.replace("import { useMemo, useState } from 'react'", "import type { JSX } from 'react';\nimport { useMemo, useState } from 'react'");
    }
    return c;
  });

edit('src/pages/admin/AdminDashboard.tsx',
  /  const selectedStoreLabel =\s*\n    storeOptions[^\n]+\n    t\('adminDashboard.allStores'\);\s*\n\n  const metrics/s,
  '  const metrics');

edit('src/pages/admin/AdminDashboard.tsx',
  /        const actorShort =\s*\n          log\.actor_id[^\n]+\n            : log\.actor_id;\s*\n\n        const title/s,
  '        const title');

edit('src/pages/admin/IntegrationsPage.tsx',
  'import { Zap, Plug, Clock }',
  'import { Plug, Clock }');

edit('src/pages/admin/UsersPage.tsx',
  "import type { User as ApiUser, UserStatus as ApiUserStatus } from '../../api/users';\nimport type { Role as ApiRole } from '../../api/roles';\nimport * as usersApi",
  "import * as usersApi");

edit('src/pages/admin/UsersPage.tsx',
  /type UserListResponse = \{[^}]+\};\s*\n\ntype RoleListResponse = \{[^}]+\};\s*\n\n\/\*\* ---------- Component/s,
  '/** ---------- Component');

edit('src/pages/auth/ForgotPasswordPage.tsx',
  'const onSubmit = async (data: ForgotPasswordForm)',
  'const onSubmit = async (_data: ForgotPasswordForm)');

edit('src/pages/auth/ResetPasswordPage.tsx',
  'const onSubmit = async (data: ResetPasswordForm)',
  'const onSubmit = async (_data: ResetPasswordForm)');

edit('src/pages/crew/CrewChecklist.tsx',
  'err.response?.data?.message ||',
  '(err.response?.data as { message?: string; error?: string })?.message ||');

edit('src/pages/crew/CrewChecklist.tsx',
  'err.response?.data?.error ||',
  '(err.response?.data as { message?: string; error?: string })?.error ||');

edit('src/pages/crew/CrewHome.tsx',
  /  const summary = \{[^}]+\};\s*\n\n  if \(isLoading\)/s,
  '  if (isLoading)');

edit('src/pages/crew/CrewHome.tsx',
  (c) => c.replace(/\nfunction SummaryCard\(\{ label, value \}: \{ label: string; value: number \| string \}\) \{\s*return \([^)]+\);\s*\}\s*\n\nfunction StatusPill/s, '\nfunction StatusPill'));

edit('src/pages/crew/CrewJobDetail.tsx',
  '  Play,\n  ',
  '  ');

edit('src/pages/crew/CrewJobDetail.tsx',
  'import toast from \'react-hot-toast\';\nimport',
  'import');

edit('src/pages/crew/CrewJobDetail.tsx',
  (c) => c.replace(/\n  const onAccept = \([^}]+\};\s*\n\n  const onStart = \([^}]+\};\s*\n\n  return \(/s, '\n  return ('));

edit('src/pages/crew/CrewJobs.tsx',
  'const [q, setQ] = useState',
  'const [q] = useState');

edit('src/pages/crew/CrewOrderDetail.tsx',
  'AlertTriangle, ',
  '');

edit('src/pages/manager/ManagerDashboard.tsx',
  (c) => {
    if (!c.includes("import type { JSX } from 'react'")) {
      return c.replace("import { useMemo } from 'react'", "import type { JSX } from 'react';\nimport { useMemo } from 'react'");
    }
    return c;
  });

edit('src/pages/manager/ManagerDashboard.tsx',
  '  TrendingUp,\n  ',
  '  ');

edit('src/pages/manager/OrderDetailPage.tsx',
  '  const items = useMemo(() => order?.items ?? [], [order]);\n\n  ',
  '  ');

edit('src/pages/manager/OrderDetailPage.tsx',
  (c) => c.replace(/  const statusBadge = \(s\?: string\) =>\s*\n    s === 'confirmed'[^;]+;\s*\n\n  const formatDateTime/s, '  const formatDateTime'));

edit('src/pages/manager/OrdersPage.tsx',
  'import { listOrders, type ListOrdersParams, type Order }',
  'import { listOrders, type Order }');

edit('src/pages/manager/OrdersPage.tsx',
  '  const { user } = useAuthStore()',
  '  useAuthStore()');

edit('src/pages/manager/InstallationDetailPage.tsx',
  'type InstallationWithRelations = Installation & {\n  items?: InstallationItemDto[];\n  crew?: CrewAssignmentDto[];\n};',
  'type InstallationWithRelations = Installation & {\n  items?: InstallationItemDto[];\n  crew?: CrewAssignmentDto[];\n  external_order_id?: string;\n};');

edit('src/pages/shared/AuditPage.tsx',
  "import { listAuditLogs, type AuditLog } from",
  "import { listAuditLogs, type AuditLog, type AuditLogList } from");

edit('src/pages/shared/AuditPage.tsx',
  (c) => {
    let s = c.replace(/\s*keepPreviousData: true,\s*/, '\n    placeholderData: keepPreviousData,\n  ');
    if (!s.includes('keepPreviousData')) {
      s = s.replace("import { useQuery } from '@tanstack/react-query'", "import { keepPreviousData, useQuery } from '@tanstack/react-query'");
    }
    s = s.replace(/const query = useQuery\(\{/, 'const query = useQuery<AuditLogList>({');
    return s;
  });

edit('src/components/layout/CrewShell.tsx',
  '  const { user, logout } = useAuthStore()',
  '  useAuthStore()');

edit('src/components/layout/CrewShell.tsx',
  (c) => c.replace(/\n  const navigate = useNavigate\(\);\s*\n/, '\n  useNavigate();\n'));

edit('src/components/layout/CrewShell.tsx',
  (c) => c.replace(/\n  const handleLogout = async \([^}]+\};\s*\n\n  const handleSync/s, '\n  const handleSync'));

edit('src/App.tsx',
  '  const { isAuthenticated, user } = useAuthStore()',
  '  const { user } = useAuthStore()');

edit('src/stores/offline.ts',
  (c) => c.replace(/retryFailedActions: async \(\) => \{\s*const \{ actions \} = get\(\);\s*\/\/ Reset failed/s, 'retryFailedActions: async () => {\n        // Reset failed'));

console.log('Done. Run: npm run build');
