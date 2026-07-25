import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "./AppShell";
import LandingPage from "../pages/LandingPage";

const InterviewPage = lazy(() => import("../pages/InterviewPage"));
const RoutePage = lazy(() => import("../pages/RoutePage"));
const LessonPage = lazy(() => import("../pages/LessonPage"));
const AssessmentPage = lazy(() => import("../pages/AssessmentPage"));
const RecalibratedPage = lazy(() => import("../pages/RecalibratedPage"));

function PageLoader() {
  return (
    <div className="page-loader" role="status">
      Preparando tu siguiente señal…
    </div>
  );
}

function lazyPage(page: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{page}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/interview", element: lazyPage(<InterviewPage />) },
      { path: "/route", element: lazyPage(<RoutePage />) },
      { path: "/lesson/:nodeId", element: lazyPage(<LessonPage />) },
      { path: "/assessment/:nodeId", element: lazyPage(<AssessmentPage />) },
      {
        path: "/route/recalibrated",
        element: lazyPage(<RecalibratedPage />),
      },
      { path: "*", element: <Navigate replace to="/" /> },
    ],
  },
]);
