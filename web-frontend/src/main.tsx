import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { AppSocketProvider } from "./realtime/AppSocketProvider";
import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppSocketProvider>
        <App />
      </AppSocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
