Design system: Purple primary (258 58% 52%), Orange accent (25 95% 53%), Inter + JetBrains Mono fonts.
Roles: Super Admin, HR/Admin, Employee — role switcher in sidebar footer (demo mode, stored in localStorage).
RoleContext at src/contexts/RoleContext.tsx provides isAdmin, isHR, isEmployee.
Sidebar navigation changes per role. Employee sees only Dashboard, My Profile, Attendance, Leave.
Employee profile page at /employees/:id with tabs: Personal, Documents, Emergency, Bank, Department, Assets.
Status types: Active, On Leave, Notice Period, Resigned, Inactive — with corresponding CSS classes.
Logo: src/assets/logo.png (purple/orange diamond shape).
ZKTeco: ZKBioAccess Web API approach. Device config dialog in Attendance page.
All data is currently mock/static - no backend connected yet.

## Architecture (Production-Ready)
- **Types**: `src/types/index.ts` — all shared TypeScript interfaces and types
- **Mock Data**: `src/data/mock-data.ts` — centralized data store (replace with DB)
- **Services**: `src/services/api.ts` — async service layer with Promise-based CRUD ops
- **Hooks**: `src/hooks/use-data.ts` — React Query hooks wrapping services (caching, mutations)
- **Status CSS**: `src/lib/status-classes.ts` — centralized status-to-CSS mappings
- **Payroll Engine**: `src/lib/payroll-engine.ts` — Nepal TDS calculation with SST waiver logic
- Pages consume hooks → hooks call services → services use mock data (swap for Supabase)
