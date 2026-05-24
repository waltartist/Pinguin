import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ContextMenuProvider } from "./components/ContextMenu";
import "dockview-react/dist/styles/dockview.css";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ContextMenuProvider>
        <App />
      </ContextMenuProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
