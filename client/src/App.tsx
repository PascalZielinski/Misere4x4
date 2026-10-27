import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import LandingPage from "./pages/landingpage";
import NotFound from "./pages/404";
import LocalGame from "./pages/localgamepage";

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/local", element: <LocalGame /> },
  { path: "*", element: <NotFound /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}