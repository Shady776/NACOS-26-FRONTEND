import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installAuthFetch } from "./lib/auth";

// Must run before anything calls fetch(): makes API calls send the login cookies
// and refresh the session automatically when the short-lived token expires.
installAuthFetch();

createRoot(document.getElementById("root")!).render(<App />);
