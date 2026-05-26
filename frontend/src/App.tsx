import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "../src/components/common/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import EmployeeList from "./pages/EmployeeList";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import LeaveManagement from "./pages/LeaveManagement";
import EmployeeSelfService from "./pages/EmployeeSelfService";
import Offboarding from "./pages/Offboarding";
import Reports from "./pages/Reports";
import RolesAccess from "./pages/RolesAccess";
import AssetManagement from "./pages/AssetManagement";
import Payroll from "./pages/Payroll";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import {
  DashboardAction,
  EmployeesAction,
  AttendanceAction,
  LeaveManagementAction,
  PayrollAction,
  AssetsAction,
  OffboardingAction,
  ReportsAction,
  RolesandAccessAction,
  EmployeeSelfServiceAction,
} from "@/permissions/permission";

const queryClient = new QueryClient();

const App = () => {
  const protectedLayout = (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );

  const router = createBrowserRouter([
    { path: "/login", element: <Login /> },
    { path: "/signup", element: <Signup /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    {
      path: "/",
      element: protectedLayout,
      children: [
        {
          index: true,
          element: (
            <ProtectedRoute action={DashboardAction.View}>
              <Dashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: "employees",
          element: (
            <ProtectedRoute action={EmployeesAction.View}>
              <EmployeeList />
            </ProtectedRoute>
          ),
        },
        {
          path: "employees/:id",
          element: (
            <ProtectedRoute action={EmployeesAction.View}>
              <EmployeeProfile />
            </ProtectedRoute>
          ),
        },
        {
          path: "attendance",
          element: (
            <ProtectedRoute action={AttendanceAction.View}>
              <Attendance />
            </ProtectedRoute>
          ),
        },
        {
          path: "leave",
          element: (
            <ProtectedRoute action={LeaveManagementAction.View}>
              <LeaveManagement />
            </ProtectedRoute>
          ),
        },
        {
          path: "payroll",
          element: (
            <ProtectedRoute action={PayrollAction.View}>
              <Payroll />
            </ProtectedRoute>
          ),
        },
        {
          path: "ess",
          element: (
            <ProtectedRoute action={EmployeeSelfServiceAction.View}>
              <EmployeeSelfService />
            </ProtectedRoute>
          ),
        },
        {
          path: "offboarding",
          element: (
            <ProtectedRoute action={OffboardingAction.View}>
              <Offboarding />
            </ProtectedRoute>
          ),
        },
        {
          path: "reports",
          element: (
            <ProtectedRoute action={ReportsAction.View}>
              <Reports />
            </ProtectedRoute>
          ),
        },
        {
          path: "roles",
          element: (
            <ProtectedRoute action={RolesandAccessAction.View}>
              <RolesAccess />
            </ProtectedRoute>
          ),
        },
        {
          path: "assets",
          element: (
            <ProtectedRoute action={AssetsAction.View}>
              <AssetManagement />
            </ProtectedRoute>
          ),
        },
        { path: "*", element: <NotFound /> },
      ],
    },
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RoleProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <RouterProvider router={router} />
            </TooltipProvider>
          </RoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
