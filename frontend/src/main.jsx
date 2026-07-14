import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ShopProvider } from "./context/ShopContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import "./styles/variables.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ShopProvider>
            <NotificationProvider>
              <App />
              <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
            </NotificationProvider>
          </ShopProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
