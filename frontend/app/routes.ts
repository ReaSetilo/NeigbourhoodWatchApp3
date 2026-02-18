import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    route('', 'routes/root/LandingPage.tsx'),
    layout('routes/admin/AdminLayout.tsx', [
        route('dashboard', 'routes/admin/Dashboard.tsx'),
        route('all-users', 'routes/admin/AllUsers.tsx'),
        route('houses', 'routes/admin/Houses.tsx'),
        route('system-config', 'routes/admin/SystemConfig.tsx'),
        route('admins', 'routes/admin/Administrators.tsx'),
        route('members', 'routes/admin/Members.tsx'),
        route('officers', 'routes/admin/SecurityOfficers.tsx'),
        route('patrol-stats', 'routes/admin/PatrolStats.tsx')
    ])
] satisfies RouteConfig;