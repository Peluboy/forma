import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tokens.css";
import "./styles/fonts.css";
import "./styles/ui.css";
import "./styles/styles.css";
import "./styles/site.css";
import { applyThemePreference, readThemePreference } from "./shared/theme";

applyThemePreference(readThemePreference());
const Dashboard = lazy(() => import("./features/projects/Dashboard"));
const CreatePage = lazy(() => import("./features/create/CreatePage"));
const EditorPage = lazy(() => import("./features/editor/EditorPage"));
const ReviewPage = lazy(() => import("./features/review/ReviewPage"));
const HomePage = lazy(() => import("./features/site/PublicSite"));
const PricingPage = lazy(() =>
  import("./features/site/PublicSite").then((m) => ({
    default: m.PricingPage,
  })),
);
const TemplatesPage = lazy(() =>
  import("./features/site/PublicSite").then((m) => ({
    default: m.TemplatesPage,
  })),
);
const HelpPage = lazy(() =>
  import("./features/site/PublicSite").then((m) => ({ default: m.HelpPage })),
);
const NotFound = lazy(() =>
  import("./features/site/PublicSite").then((m) => ({
    default: m.NotFoundPage,
  })),
);
const AuthPage = lazy(() => import("./features/account/AuthPage"));
const Onboarding = lazy(() => import("./features/account/Onboarding"));
const AccountSettings = lazy(
  () => import("./features/account/AccountSettings"),
);
const PipelineDevPanel = lazy(() => import("./features/dev/PipelineDevPanel"));
const path = location.pathname.replace(/\/$/, "") || "/";
const query = new URLSearchParams(location.search);
// Preserve payment and password-reset links issued by the previous release.
if (path === "/" && query.has("billing"))
  location.replace(`/account?tab=billing&${query}`);
const screen = path.startsWith("/review/") ? (
  <ReviewPage token={path.split("/")[2]} />
) : path === "/dashboard" ? (
  <Dashboard />
) : path === "/dev/pipeline" || path === "/dev" ? (
  <PipelineDevPanel />
) : path === "/create" ? (
  <CreatePage />
) : path === "/editor" ? (
  <EditorPage />
) : path === "/pricing" ? (
  <PricingPage />
) : path === "/templates" ? (
  <TemplatesPage />
) : path === "/help" ? (
  <HelpPage />
) : path === "/login" ? (
  <AuthPage mode="login" />
) : path === "/signup" ? (
  <AuthPage mode="register" />
) : path === "/forgot-password" ? (
  <AuthPage mode="recover" />
) : path === "/reset-password" ||
  (path === "/" && query.get("reset") === "1") ? (
  <AuthPage mode="password" />
) : path === "/auth/callback" ? (
  <AuthPage mode="login" callback />
) : path === "/onboarding" ? (
  <Onboarding />
) : path === "/account" ? (
  <AccountSettings />
) : path === "/" ? (
  <HomePage />
) : (
  <NotFound />
);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense
      fallback={
        <div
          className="min-h-dvh grid place-items-center bg-bg-page text-text-secondary text-sm"
          role="status"
        >
          Opening Forma…
        </div>
      }
    >
      {screen}
    </Suspense>
  </React.StrictMode>,
);
