import { cn } from '@/lib/utils';
import {
    BarChart3, Bug, CalendarDays, ClipboardCheck, Coffee, Database, FileText, GraduationCap, KeyRound, Lightbulb, type LucideIcon, Mail,
    MessageSquare, Monitor, Package, Phone, RefreshCw, Rocket, Search, Server, Settings, ShieldCheck, TriangleAlert, Users, Wrench,
} from 'lucide-react';

/**
 * Identité visuelle d'une tâche : Kevin retient l'image d'un sujet plus que son titre.
 * Chaque tâche a donc un pictogramme et une couleur (choisis, ou déduits de l'étiquette à défaut).
 * Liste alignée sur Task::ICONS et Task::HUES côté serveur.
 */
export const taskIcons: Record<string, { icon: LucideIcon; label: string }> = {
    server: { icon: Server, label: 'Serveur' },
    database: { icon: Database, label: 'Base de données' },
    bug: { icon: Bug, label: 'Anomalie' },
    rocket: { icon: Rocket, label: 'Mise en production' },
    refresh: { icon: RefreshCw, label: 'Mise à jour' },
    shield: { icon: ShieldCheck, label: 'Sécurité' },
    key: { icon: KeyRound, label: 'Accès' },
    mail: { icon: Mail, label: 'E-mail' },
    phone: { icon: Phone, label: 'Appel' },
    users: { icon: Users, label: 'Utilisateurs' },
    calendar: { icon: CalendarDays, label: 'Réunion' },
    file: { icon: FileText, label: 'Document' },
    graduation: { icon: GraduationCap, label: 'Formation' },
    clipboard: { icon: ClipboardCheck, label: 'Recette' },
    wrench: { icon: Wrench, label: 'Paramétrage' },
    settings: { icon: Settings, label: 'Configuration' },
    search: { icon: Search, label: 'Analyse' },
    chart: { icon: BarChart3, label: 'Statistiques' },
    alert: { icon: TriangleAlert, label: 'Incident' },
    lightbulb: { icon: Lightbulb, label: 'Idée' },
    package: { icon: Package, label: 'Livraison' },
    monitor: { icon: Monitor, label: 'Poste de travail' },
    message: { icon: MessageSquare, label: 'Échange' },
    coffee: { icon: Coffee, label: 'Pause' },
};

/** Teintes des tuiles. Assez foncées pour un pictogramme ou une initiale en blanc lisible (4,5:1 au moins). */
export const taskHues: Record<string, string> = {
    blue: '#2563EB',
    violet: '#7C3AED',
    green: '#047857',
    amber: '#B45309',
    rose: '#E11D48',
    slate: '#475569',
};

const hueKeys = Object.keys(taskHues);
/** Sans couleur choisie, la couleur vient de l'étiquette : toutes les tâches d'un même sujet se ressemblent. */
export const hueOf = (hue: string | null, tag: string | null) =>
    taskHues[hue ?? ''] ?? (tag ? taskHues[hueKeys[[...tag].reduce((n, c) => n + c.charCodeAt(0), 0) % hueKeys.length]] : taskHues.slate);

export function TaskTile({ icon, hue, tag, title, className }: { icon: string | null; hue: string | null; tag: string | null; title: string; className?: string }) {
    const Icon = icon ? taskIcons[icon]?.icon : null;
    return (
        <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-[0.625rem] font-semibold text-white shadow-xs', className)} style={{ background: hueOf(hue, tag) }}>
            {Icon ? <Icon className="size-[55%]" strokeWidth={2} /> : <span className="text-[0.95em] leading-none">{(title.trim()[0] ?? '?').toUpperCase()}</span>}
        </span>
    );
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const day = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
export const daysSince = (iso: string | null, today: string) => (iso ? Math.max(0, Math.round((day(today) - day(iso)) / 864e5)) : 0);

/**
 * Anneau d'attente : les initiales de la personne attendue, entourées d'un anneau qui se remplit jusqu'à la date de
 * relance. Bleu en attente, ambre quand il faut relancer, rouge quand la relance a largement dépassé.
 */
export function WaitingRing({ who, since, followUp, today, className }: { who: string | null; since: string | null; followUp: string | null; today: string; className?: string }) {
    const span = since && followUp ? Math.max(1, (day(followUp) - day(since)) / 864e5) : 3;
    const elapsed = daysSince(since, today);
    const progress = Math.min(1, elapsed / span);
    const due = !!followUp && followUp <= today;
    const late = due && daysSince(followUp, today) >= span;
    const color = late ? 'var(--destructive)' : due ? 'var(--chart-3)' : 'var(--chart-1)';
    const r = 15;
    const c = 2 * Math.PI * r;
    return (
        <span className={cn('relative grid size-10 shrink-0 place-items-center', className)} role="img" aria-label={`En attente de ${who || 'quelqu’un'} depuis ${elapsed} jour${elapsed > 1 ? 's' : ''}${due ? ', à relancer' : ''}`}>
            <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
                <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" style={{ stroke: 'var(--muted)' }} />
                <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(progress, 0.04))} style={{ stroke: color, transition: 'stroke-dashoffset .4s' }} />
            </svg>
            <span className="bg-muted text-foreground grid size-7 place-items-center rounded-full text-[0.65rem] font-semibold">{initials(who ?? '')}</span>
        </span>
    );
}
