import { BrowserRouter, Routes, Route } from "react-router";
// import { Home } from "./pages/home";
import { Dashboard } from "./pages/dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
