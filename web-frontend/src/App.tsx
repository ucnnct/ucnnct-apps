import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import Home from "./pages/Home";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";

export default function App() {
  const { initialized, authenticated, login } = useAuth();

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black uppercase tracking-widest text-secondary-400">
            Connexion en cours...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    login();
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black uppercase tracking-widest text-secondary-400">
            Redirection vers la connexion...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}
