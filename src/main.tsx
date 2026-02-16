import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

/**
 * 🛡️ PARCHE CRÍTICO: Prevenir error "removeChild" de React
 * 
 * Este error ocurre cuando extensiones del navegador (Grammarly, LastPass,
 * traducción automática de Chrome, ad blockers, etc.) modifican el DOM
 * directamente, rompiendo la relación padre-hijo que React espera.
 * 
 * React internamente llama node.removeChild(child) pero el child ya fue
 * movido/envuelto por la extensión. Este parche intercepta esas llamadas
 * y las maneja gracefully en vez de crashear toda la app.
 * 
 * Solución estándar usada en producción por grandes apps React.
 * Ref: https://github.com/facebook/react/issues/11538
 */
if (typeof Node !== 'undefined' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  // @ts-expect-error - Overriding native method for React compatibility
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      console.warn(
        '[DOM Patch] removeChild: el nodo no es hijo directo, ignorando para evitar crash de React',
      );
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  // @ts-expect-error - Overriding native method for React compatibility
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn(
        '[DOM Patch] insertBefore: el nodo de referencia no es hijo directo, ignorando para evitar crash de React',
      );
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
