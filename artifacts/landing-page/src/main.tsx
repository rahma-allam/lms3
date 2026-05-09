import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// main.tsx — السطر الأول قبل createRoot
const slug = new URLSearchParams(window.location.search).get("tenant");
if (slug) localStorage.setItem("tenant_slug", slug);
createRoot(document.getElementById("root")!).render(<App />);
