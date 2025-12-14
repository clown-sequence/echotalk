import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Authentication } from "./pages/authentication";
import { EchoTalk } from "./pages/echotalk";
import { ProtectedRoute } from "./components/protected-route";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication page - Public route */}
        <Route path="/authentication/*" element={<Authentication />} />
        
        {/* Chat Hub - Protected route */}
        <Route 
          path="/chat-hub" 
          element={
            <ProtectedRoute>
              <EchoTalk />
            </ProtectedRoute>
          } 
        />

        {/* Root redirect - Goes to chat-hub if authenticated, otherwise ProtectedRoute redirects to auth */}
        <Route path="/" element={<Navigate to="/chat-hub" replace />} />
        
        {/* Catch all unknown routes - Redirect to authentication */}
        <Route path="*" element={<Navigate to="/authentication" replace />} />
      </Routes>
    </BrowserRouter>
  );
}