import { Buffer } from "buffer";
// Polyfill for @solana/web3.js + wallet adapter (require Node Buffer in browser).
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
