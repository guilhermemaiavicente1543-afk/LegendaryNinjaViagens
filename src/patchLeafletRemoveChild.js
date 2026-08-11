/*
  LN Digital - proteção para conflito React/Leaflet.

  Às vezes o Leaflet remove/move um nó de overlay internamente
  e, logo depois, o React tenta remover o mesmo nó do container antigo.
  Isso gera:
  "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."

  Em vez de derrubar o app inteiro, ignoramos somente esse removeChild inválido.
*/

if (
  typeof window !== "undefined" &&
  typeof Node !== "undefined" &&
  !window.__LN_DIGITAL_REMOVE_CHILD_PATCH__
) {
  window.__LN_DIGITAL_REMOVE_CHILD_PATCH__ = true;

  const originalRemoveChild = Node.prototype.removeChild;

  Node.prototype.removeChild = function patchedRemoveChild(child) {
    if (child && child.parentNode !== this) {
      console.warn("[LN Digital] removeChild inválido ignorado:", {
        container: this,
        child,
        actualParent: child.parentNode,
      });

      return child;
    }

    return originalRemoveChild.call(this, child);
  };
}
