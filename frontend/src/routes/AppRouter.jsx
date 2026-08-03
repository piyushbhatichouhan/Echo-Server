import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import Dashboard from "../pages/Dashboard/Dashboard";
import Projects from "../pages/Projects/Projects";
import Project from "../pages/Project/Project";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";
import Settings from "../pages/Settings/Settings";
import Server from "../pages/server/server";
import PendingUsers from "../pages/server/pendingUsers/pendingUsers";
import ProjectLayout from "../layouts/ProjectLayout";
import Deployments from "../components/project/deployments/deployments";
import Environment from "../components/project/environment/Environment";

import LogsCard from "../components/project/logscard/logscard";
import ManageUsers from "../pages/server/manageUsers/ManageUsers";
import Storage from "../pages/server/storage/Storage";
import CloudStorage from "../pages/CloudStorage/CloudStorage";
import VerifyEmailFailed from "../pages/auth/verify-email/VerifyEmailFailed";
import VerifyEmailSuccess from "../pages/auth/verify-email/VerifyEmailSuccess";
import VerifyEmail from "../pages/auth/verify-email/VerifyEmail";
import ForgotPassword from "../pages/auth/forgotpassword/ForgotPassword";
import ResetPassword from "../pages/auth/forgotpassword/ResetPassword";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/verify-email-success" element={<VerifyEmailSuccess />} />

        <Route path="/verify-email-failed" element={<VerifyEmailFailed />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<Project />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/server" element={<Server />} />
          <Route path="/server/pending-users" element={<PendingUsers />} />
          <Route path="/server/users" element={<ManageUsers />} />
          <Route path="/server/storage" element={<Storage />} />
          <Route path="/cloud-storage" element={<CloudStorage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
