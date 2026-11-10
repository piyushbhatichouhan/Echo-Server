import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/global.css";
import { ToastProvider } from "./context/ToastContext";
import { UploadProvider } from "./context/UploadContext";

import ToastContainer from "./components/common/toast/ToastContainer";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <ThemeProvider>
      <ToastProvider>
        <UploadProvider>
          <App />

          <ToastContainer />
        </UploadProvider>
      </ToastProvider>
    </ThemeProvider>
  </AuthProvider>,
);
