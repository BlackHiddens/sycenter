/** Jeton CSRF de Laravel, lu dans son cookie, pour les appels faits hors Inertia. */
export const xsrf = () => decodeURIComponent(document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '');

/** POST JSON vers l'application (même origine), sans recharger la page. Rejette si le serveur répond une erreur. */
export async function postJson<T = unknown>(url: string, body: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrf() },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.status === 204 ? (undefined as T) : res.json();
}
