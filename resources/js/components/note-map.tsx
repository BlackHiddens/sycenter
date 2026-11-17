import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export type MapNote = { id: number; title: string; color: string; preview: string | null; links: number[] | null };
type Colors = Record<string, { name: string; hex: string }>;

const W = 1100;
const H = 680;
const CARD_W = 128;
const CARD_H = 96;

/**
 * Carte des notes : chaque couleur forme un îlot, les liens tirent les notes l'une vers l'autre.
 * Disposition calculée une fois (simulation de forces simple et déterministe), puis figée.
 */
function layout(notes: MapNote[], colorKeys: string[]) {
    const groups = colorKeys.filter((k) => notes.some((n) => n.color === k));
    const centers = Object.fromEntries(groups.map((k, i) => {
        if (groups.length === 1) return [k, { x: W / 2, y: H / 2 }];
        const a = (i / groups.length) * Math.PI * 2 - Math.PI / 2;
        return [k, { x: W / 2 + Math.cos(a) * W * 0.3, y: H / 2 + Math.sin(a) * H * 0.3 }];
    }));
    const pos = notes.map((n, i) => {
        const c = centers[n.color] ?? { x: W / 2, y: H / 2 };
        const a = i * 2.4;
        return { x: c.x + Math.cos(a) * (20 + i * 6), y: c.y + Math.sin(a) * (20 + i * 6), vx: 0, vy: 0 };
    });
    const index = new Map(notes.map((n, i) => [n.id, i]));
    const edges: [number, number][] = [];
    const seen = new Set<string>();
    notes.forEach((n, i) => (n.links ?? []).forEach((id) => {
        const j = index.get(id);
        const key = [Math.min(i, j ?? -1), Math.max(i, j ?? -1)].join('-');
        if (j !== undefined && !seen.has(key)) {
            seen.add(key);
            edges.push([i, j]);
        }
    }));

    for (let step = 0; step < 300; step++) {
        for (let i = 0; i < pos.length; i++) {
            for (let j = i + 1; j < pos.length; j++) {
                const dx = pos[j].x - pos[i].x || 0.1;
                const dy = pos[j].y - pos[i].y || 0.1;
                const d2 = Math.max(dx * dx + dy * dy, 100);
                const f = 26000 / d2;
                const d = Math.sqrt(d2);
                pos[i].vx -= (f * dx) / d; pos[i].vy -= (f * dy) / d;
                pos[j].vx += (f * dx) / d; pos[j].vy += (f * dy) / d;
            }
        }
        for (const [i, j] of edges) {
            const dx = pos[j].x - pos[i].x;
            const dy = pos[j].y - pos[i].y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const f = (d - 190) * 0.02;
            pos[i].vx += (f * dx) / d; pos[i].vy += (f * dy) / d;
            pos[j].vx -= (f * dx) / d; pos[j].vy -= (f * dy) / d;
        }
        notes.forEach((n, i) => {
            const c = centers[n.color] ?? { x: W / 2, y: H / 2 };
            pos[i].vx += (c.x - pos[i].x) * 0.015;
            pos[i].vy += (c.y - pos[i].y) * 0.015;
            pos[i].x = Math.min(W - CARD_W / 2 - 10, Math.max(CARD_W / 2 + 10, pos[i].x + pos[i].vx * 0.5));
            pos[i].y = Math.min(H - CARD_H / 2 - 10, Math.max(CARD_H / 2 + 30, pos[i].y + pos[i].vy * 0.5));
            pos[i].vx *= 0.6;
            pos[i].vy *= 0.6;
        });
    }

    const islands = groups.map((k) => {
        const members = pos.filter((_, i) => notes[i].color === k);
        const xs = members.map((p) => p.x);
        const ys = members.map((p) => p.y);
        return { key: k, x: Math.min(...xs) - CARD_W / 2 - 18, y: Math.min(...ys) - CARD_H / 2 - 30, w: Math.max(...xs) - Math.min(...xs) + CARD_W + 36, h: Math.max(...ys) - Math.min(...ys) + CARD_H + 48 };
    });
    return { pos, edges, islands };
}

export default function NoteMap({ notes, colors }: { notes: MapNote[]; colors: Colors }) {
    const [hover, setHover] = useState<number | null>(null);
    const { pos, edges, islands } = useMemo(() => layout(notes, Object.keys(colors)), [notes, colors]);
    const near = (i: number) => hover !== null && (i === hover || edges.some(([a, b]) => (a === hover && b === i) || (b === hover && a === i)));
    const open = (id: number) => router.visit(route('notes.edit', id));

    return (
        <div className="bg-card overflow-x-auto rounded-[0.875rem] border">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[45rem]" role="group" aria-label="Carte des notes, regroupées par couleur et reliées par leurs liens">
                {islands.map((g) => (
                    <g key={g.key}>
                        <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={22} fill={colors[g.key].hex} fillOpacity={0.07} stroke={colors[g.key].hex} strokeOpacity={0.35} strokeDasharray="5 6" />
                        <circle cx={g.x + 16} cy={g.y + 15} r={5} fill={colors[g.key].hex} />
                        <text x={g.x + 28} y={g.y + 20} fontSize={13} fontWeight={600} style={{ fill: 'var(--muted-foreground)' }}>{colors[g.key].name}</text>
                    </g>
                ))}
                {edges.map(([a, b]) => {
                    const p = pos[a];
                    const q = pos[b];
                    const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.15;
                    const my = (p.y + q.y) / 2 - (q.x - p.x) * 0.15;
                    const lit = hover === a || hover === b;
                    return <path key={`${a}-${b}`} d={`M${p.x},${p.y} Q${mx},${my} ${q.x},${q.y}`} fill="none" strokeWidth={lit ? 2.5 : 1.5} strokeLinecap="round" style={{ stroke: lit ? 'var(--foreground)' : 'var(--muted-foreground)', opacity: lit ? 0.9 : 0.4 }} />;
                })}
                {notes.map((n, i) => {
                    const p = pos[i];
                    const dim = hover !== null && !near(i);
                    return (
                        <g key={n.id} transform={`translate(${p.x - CARD_W / 2} ${p.y - CARD_H / 2})`} role="link" tabIndex={0} aria-label={`Ouvrir la note ${n.title}`}
                            className="cursor-pointer outline-none" style={{ opacity: dim ? 0.35 : 1, transition: 'opacity .15s' }}
                            onClick={() => open(n.id)} onKeyDown={(e) => e.key === 'Enter' && open(n.id)}
                            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                            <rect width={CARD_W} height={CARD_H} rx={10} strokeWidth={hover === i ? 2.5 : 1.5} style={{ fill: 'var(--card)', stroke: colors[n.color]?.hex }} />
                            <rect x={5} y={5} width={CARD_W - 10} height={CARD_H - 32} rx={6} style={{ fill: 'var(--muted)' }} />
                            {n.preview && <image href={n.preview} x={7} y={7} width={CARD_W - 14} height={CARD_H - 36} preserveAspectRatio="xMidYMid meet" />}
                            <text x={CARD_W / 2} y={CARD_H - 10} textAnchor="middle" fontSize={12} fontWeight={600} style={{ fill: 'var(--foreground)' }}>
                                {n.title.length > 17 ? `${n.title.slice(0, 16)}…` : n.title}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
