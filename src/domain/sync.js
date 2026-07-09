/**
 * Merge de sincronização (puro). Versão testável de STORE.mergeRemote.
 * Resolução de conflito: last-write-wins por `updatedAt`.
 * Exclusão é lógica (`deleted: true`), então um tombstone remoto mais novo
 * "vence" e propaga o apagamento como qualquer outra atualização.
 *
 * Retorna { list, changed }. Não muta a lista original.
 */
export function mergeRemote(list, remote) {
  if (!remote || !remote.id) return { list, changed: false };
  const i = list.findIndex((e) => e.id === remote.id);
  if (i < 0) {
    return { list: [...list, remote], changed: true };
  }
  if ((remote.updatedAt || 0) > (list[i].updatedAt || 0)) {
    const out = [...list];
    out[i] = remote;
    return { list: out, changed: true };
  }
  return { list, changed: false };
}
