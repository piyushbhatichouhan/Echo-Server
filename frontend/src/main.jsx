import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.css";
import { ToastProvider } from "./context/ToastContext";

import ToastContainer from "./components/common/toast/ToastContainer";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <ToastProvider>
      <App />

      <ToastContainer />
    </ToastProvider>
  </AuthProvider>,
);
