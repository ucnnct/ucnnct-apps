import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Messages from "./pages/Messages";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/messages" element={<Messages />} />
      </Routes>
    </BrowserRouter>
  );
}
