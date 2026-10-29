import { createBrowserRouter, Outlet, redirect, type LoaderFunctionArgs } from "react-router"
import { RouterProvider } from "react-router/dom"
import i18n from "./i18n"
import { detectLanguage, isSupported } from "./i18n/languages"
import LandingPage from "./pages/landingpage"
import NotFound from "./pages/404"
import LocalGame from "./pages/localgamepage"
import LicensesPage from "./pages/licensespage"
import TutorialPage from "./pages/Tutorialpage"
import AdminPage from "./pages/Adminpage"
import AdminDashboard from "./pages/AdminDashboard"
import BackgroundMusic from "./components/BackgroundMusic"
import OnlinePage from "./pages/Onlinepage"
import QueuePage from "./pages/Queuepage"
import PrivateRoomPage from "./pages/Privateroompage"
import RatingPage from "./pages/Ratingpage"

function RootLayout() {
  return (
    <>
      <BackgroundMusic />
      <Outlet />
    </>
  )
}

function rootRedirect() {
  return redirect(`/${detectLanguage()}`)
}

async function langLoader({ params, request }: LoaderFunctionArgs) {
  const { lang } = params

  if (!isSupported(lang)) {
    const url = new URL(request.url)
    return redirect(`/${detectLanguage()}${url.pathname}${url.search}`)
  }

  if (i18n.language !== lang) {
    await i18n.changeLanguage(lang)
  }
  return null
}

const router = createBrowserRouter([
  { path: "/", loader: rootRedirect },
  {
    path: "/:lang",
    loader: langLoader,
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "local", element: <LocalGame /> },
      { path: "licenses", element: <LicensesPage /> },
      { path: "tutorial", element: <TutorialPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "admin/dashboard", element: <AdminDashboard /> },
      { path: "online", element: <OnlinePage /> },
      { path: "online/queue", element: <QueuePage /> },
      { path: "online/private", element: <PrivateRoomPage /> },
      //{ path: "online/private/room/:code?", element: <PrivateRoomLobbyPage /> },
      { path: "rating", element: <RatingPage />},
      { path: "*", element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}