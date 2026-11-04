import { BrowserRouter, Routes, Route } from "react-router-dom";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* TODO(#6): replace with LoginPage and RegisterPage */}
        <Route path="/" element={<PlaceholderPage title="Login" />} />
        <Route path="/register" element={<PlaceholderPage title="Register" />} />
        {/* TODO(#8): replace with OwnerDashboard; TODO(#10): replace with SitterDashboard */}
        <Route path="/owner" element={<PlaceholderPage title="Owner Dashboard" />} />
        <Route path="/sitter" element={<PlaceholderPage title="Sitter Dashboard" />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Routes>
    </BrowserRouter>
  );
}
