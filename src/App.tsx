import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Authentication } from "./pages/authentication";
import { EchoTalk } from "./pages/echotalk";
import { ProtectedRoute } from "./components/protected-route";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
