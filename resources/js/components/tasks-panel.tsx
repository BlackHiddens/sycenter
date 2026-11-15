import { PanelSection, Pill, rowClass } from '@/components/sy';
import { Link } from '@inertiajs/react';
import { BookOpenCheck, KanbanSquare } from 'lucide-react';
import { type ReactNode } from 'react';

/** Panneau commun à l'app Tâches : navigation entre le tableau et le carnet de bonnes pratiques. */
export default function TasksPanel({ current, openTasks, practiceCount, children }: { current: 'board' | 'practices'; openTasks: number; practiceCount: number; children?: ReactNode }) {
    const item = (key: string, href: string, Icon: typeof KanbanSquare, label: string, count: number) => (
        <Link href={href} className={`${rowClass} ${current === key ? 'bg-accent' : ''}`} aria-current={current === key ? 'page' : undefined}>
            <Icon className="text-muted-foreground size-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <Pill>{count}</Pill>
        </Link>
    );
    return (
        <>
            <PanelSection label="Espace">
                {item('board', route('tasks.index'), KanbanSquare, 'Tableau', openTasks)}
                {item('practices', route('practices.index'), BookOpenCheck, 'Bonnes pratiques', practiceCount)}
            </PanelSection>
            {children}
        </>
    );
}
