import { createBrowserRouter, Outlet } from "react-router";
import { RouterProvider } from "react-router/dom";
import LandingPage from "./pages/landingpage";
import NotFound from "./pages/404";
import LocalGame from "./pages/localgamepage";
import LicensesPage from "./pages/licensespage";
import BackgroundMusic from "./components/BackgroundMusic";

function RootLayout() {
  return (
    <>
      <BackgroundMusic />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/local", element: <LocalGame /> },
      { path: "/licenses", element: <LicensesPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}