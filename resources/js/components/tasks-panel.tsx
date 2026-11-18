import { PanelSection, Pill, rowClass } from '@/components/sy';
import { Link } from '@inertiajs/react';
import { Archive, NotebookTabs, KanbanSquare } from 'lucide-react';
import { type ReactNode } from 'react';

type Props = { current: 'board' | 'practices' | 'archive'; openTasks: number; practiceCount: number; archivedCount: number; children?: ReactNode };

/** Panneau commun à l'app Tâches : tableau, carnet et archive. */
export default function TasksPanel({ current, openTasks, practiceCount, archivedCount, children }: Props) {
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
                {item('practices', route('practices.index'), NotebookTabs, 'Carnet', practiceCount)}
                {item('archive', route('tasks.archive'), Archive, 'Archive', archivedCount)}
            </PanelSection>
            {children}
        </>
    );
}
