import { cn } from '@/lib/utils';
import { FileText, LucideIcon, NotebookPen, Plus, SquareCheck, Users } from 'lucide-react';
import { type CSSProperties, type ReactNode } from 'react';

export const appIcons: Record<string, LucideIcon> = { 'file-text': FileText, 'square-check': SquareCheck, 'notebook-pen': NotebookPen, users: Users, plus: Plus };

/** Tuile d'icône colorée : seul endroit, avec les états, où la couleur apparaît. */
export function IconTile({ icon, color, className }: { icon: string; color: string; className?: string }) {
    const Icon = appIcons[icon] ?? FileText;
    return (
        <span
            className={cn('grid size-[38px] shrink-0 place-items-center rounded-[10px] text-white', className)}
            style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 72%, #fff), ${color})` } as CSSProperties}
        >
            <Icon className="size-[18px]" />
        </span>
    );
}

const tones = {
    neutral: 'border-border bg-background text-muted-foreground',
    success: 'border-transparent bg-success-soft text-success',
    warning: 'border-transparent bg-warning-soft text-warning',
    danger: 'border-transparent bg-danger-soft text-danger',
};

export function Pill({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
    return <span className={cn('rounded-md border px-1.5 py-px text-xs font-medium whitespace-nowrap tabular-nums', tones[tone])}>{children}</span>;
}

export function PanelSection({ label, aside, children }: { label?: string; aside?: ReactNode; children: ReactNode }) {
    return (
        <div className="grid gap-0.5 border-b px-3 py-3.5 last:border-b-0">
            {label && (
                <div className="text-muted-foreground flex items-center justify-between px-1 pb-1.5 text-[11px] tracking-wider uppercase">
                    {label}
                    {aside}
                </div>
            )}
            {children}
        </div>
    );
}

export const rowClass = 'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium hover:bg-accent disabled:text-muted-foreground disabled:hover:bg-transparent';
export const fieldClass = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-60';
export const thClass = 'bg-muted/50 text-muted-foreground border-b px-3.5 py-2.5 text-left font-medium whitespace-nowrap';
export const tdClass = 'border-b px-3.5 py-2.5 whitespace-nowrap';
