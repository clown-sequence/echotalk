import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Authentication } from "./pages/authentication";
import { Welcome } from "./pages/welcome";
import { EchoTalk } from "./pages/echotalk";
import { ProtectedRoute } from "./components/protected-route";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />}/>
        <Route path="/authentication" element={<Authentication />}/>
        <Route path="/chat-hub" element={
          <ProtectedRoute>
            <EchoTalk />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
