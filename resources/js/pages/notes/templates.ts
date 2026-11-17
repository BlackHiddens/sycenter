import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/data/transform';

// Modèles de départ (clés de config/notes.php). Dessinés à la première ouverture d'une note vide,
// pour ne jamais partir d'une page blanche quand on pense en schémas.

type Box = { id: string; x: number; y: number; w: number; h: number; text: string; bg: string; shape?: 'rectangle' | 'ellipse' | 'diamond' };

const box = ({ id, x, y, w, h, text, bg, shape = 'rectangle' }: Box): ExcalidrawElementSkeleton => ({
    type: shape,
    id,
    x,
    y,
    width: w,
    height: h,
    backgroundColor: bg,
    fillStyle: 'solid',
    strokeColor: '#1e1e1e',
    roundness: shape === 'rectangle' ? { type: 3 } : null,
    label: { text, fontSize: 20 },
});

/** Point où la droite partant du centre de la forme, dans la direction (dx, dy), en sort ; plus un petit écart. */
function edge(b: Box, dx: number, dy: number, gap = 10) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const len = Math.hypot(dx, dy) || 1;
    const [ux, uy] = [dx / len, dy / len];
    const rx = b.w / 2;
    const ry = b.h / 2;
    // Ellipse et losange : rayon dans cette direction ; rectangle : premier bord touché.
    const r = b.shape === 'ellipse'
        ? 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2)
        : b.shape === 'diamond'
            ? 1 / (Math.abs(ux) / rx + Math.abs(uy) / ry)
            : Math.min(ux ? rx / Math.abs(ux) : Infinity, uy ? ry / Math.abs(uy) : Infinity);
    return { x: cx + ux * (r + gap), y: cy + uy * (r + gap) };
}

/** Flèche reliée à deux formes, de bord à bord : elle suit les formes quand on les déplace. */
const arrow = (from: Box, to: Box): ExcalidrawElementSkeleton => {
    const dx = to.x + to.w / 2 - (from.x + from.w / 2);
    const dy = to.y + to.h / 2 - (from.y + from.h / 2);
    const a = edge(from, dx, dy);
    const b = edge(to, -dx, -dy);
    return { type: 'arrow', x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y, strokeColor: '#1e1e1e', start: { id: from.id }, end: { id: to.id } };
};

const text = (x: number, y: number, value: string, fontSize = 20): ExcalidrawElementSkeleton => ({ type: 'text', x, y, text: value, fontSize, strokeColor: '#1e1e1e' });

function mindmap(): ExcalidrawElementSkeleton[] {
    const center: Box = { id: 'center', x: -120, y: -50, w: 240, h: 100, text: 'Sujet central', bg: '#ffec99', shape: 'ellipse' };
    const branches: Box[] = [
        { id: 'b1', x: -500, y: -250, w: 210, h: 80, text: 'Idée 1', bg: '#a5d8ff' },
        { id: 'b2', x: 290, y: -250, w: 210, h: 80, text: 'Idée 2', bg: '#b2f2bb' },
        { id: 'b3', x: -500, y: 170, w: 210, h: 80, text: 'Idée 3', bg: '#ffc9c9' },
        { id: 'b4', x: 290, y: 170, w: 210, h: 80, text: 'Idée 4', bg: '#d0bfff' },
    ];
    return [box(center), ...branches.map(box), ...branches.map((b) => arrow(center, b))];
}

function flow(): ExcalidrawElementSkeleton[] {
    const steps: Box[] = [
        { id: 's1', x: 0, y: 0, w: 200, h: 100, text: 'Départ', bg: '#b2f2bb', shape: 'ellipse' },
        { id: 's2', x: 280, y: 0, w: 200, h: 100, text: 'Étape 1', bg: '#a5d8ff' },
        { id: 's3', x: 560, y: 0, w: 200, h: 100, text: 'Étape 2', bg: '#a5d8ff' },
        { id: 's4', x: 840, y: -20, w: 200, h: 140, text: 'Vérifier ?', bg: '#ffec99', shape: 'diamond' },
        { id: 's5', x: 1120, y: 0, w: 200, h: 100, text: 'Résultat', bg: '#b2f2bb', shape: 'ellipse' },
    ];
    return [...steps.map(box), ...steps.slice(1).map((s, i) => arrow(steps[i], s))];
}

function matrix(): ExcalidrawElementSkeleton[] {
    const cells: Box[] = [
        { id: 'm1', x: 0, y: 0, w: 320, h: 210, text: 'Urgent et important\nÀ faire maintenant', bg: '#ffc9c9' },
        { id: 'm2', x: 340, y: 0, w: 320, h: 210, text: 'Important, pas urgent\nÀ planifier', bg: '#a5d8ff' },
        { id: 'm3', x: 0, y: 230, w: 320, h: 210, text: 'Urgent, pas important\nÀ déléguer', bg: '#ffec99' },
        { id: 'm4', x: 340, y: 230, w: 320, h: 210, text: "Ni l'un ni l'autre\nÀ laisser tomber", bg: '#e9ecef' },
    ];
    // Pas de flèches typographiques dans les libellés : la police manuscrite ne les dessine pas toutes.
    return [text(110, -45, 'Urgent', 24), text(430, -45, 'Pas urgent', 24), text(-170, 90, 'Important', 24), text(-200, 320, 'Pas important', 24), ...cells.map(box)];
}

function compare(): ExcalidrawElementSkeleton[] {
    const list = '+ Avantage\n+ Avantage\n− Inconvénient\n− Inconvénient';
    const column = (id: string, x: number, title: string, bg: string): [Box, ExcalidrawElementSkeleton] => {
        const b: Box = { id, x, y: 0, w: 340, h: 280, text: '', bg };
        return [b, { ...box(b), label: { text: `${title}\n\n${list}`, fontSize: 20, textAlign: 'left', verticalAlign: 'top' } } as ExcalidrawElementSkeleton];
    };
    const [a, aShape] = column('a', 0, 'Option A', '#a5d8ff');
    const [b, bShape] = column('b', 380, 'Option B', '#d0bfff');
    const decision: Box = { id: 'd', x: 190, y: 400, w: 340, h: 100, text: 'Décision', bg: '#b2f2bb', shape: 'ellipse' };
    return [aShape, bShape, box(decision), arrow(a, decision), arrow(b, decision)];
}

export const templates: Record<string, () => ExcalidrawElementSkeleton[]> = { blank: () => [], mindmap, flow, matrix, compare };
