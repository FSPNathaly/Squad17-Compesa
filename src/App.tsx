import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/home";
import { Planilha } from "./pages/planilha";
import { Dashboard } from "./pages/dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/planilha" element={<Planilha />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;