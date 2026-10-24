// Harus pertama: membaca fragmen URL (#...) sebelum klien Supabase memprosesnya.
import "./lib/recoveryHash.js";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
