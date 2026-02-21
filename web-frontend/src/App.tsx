import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import Home from "./pages/Home";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Cercles from "./pages/Cercles";
import FriendRequests from "./pages/FriendRequests";
import { RouteContextReporter } from "./realtime/RouteContextReporter";

export default function App() {
  const { initialized, authenticated, login } = useAuth();

  useEffect(() => {
    if (initialized && !authenticated) {
      login();
    }
  }, [authenticated, initialized, login]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-normal text-secondary-400">
            Connexion en cours...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-normal text-secondary-400">
            Redirection vers la connexion...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <RouteContextReporter />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/cercles" element={<Cercles />} />
        <Route path="/friend-requests" element={<FriendRequests />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/profile/:id" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}
