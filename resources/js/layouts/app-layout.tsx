import { themes } from '@/components/appearance-tabs';
import { appIcons } from '@/components/sy';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { useAppearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Check, LayoutGrid, Palette } from 'lucide-react';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
    actions?: ReactNode;
    panel?: ReactNode;
    panelTitle?: string;
}

const railBtn =
    'grid size-[34px] place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-sidebar-ring';

function RailItem({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
    );
}

/** Rail d'icônes (une par app) + panneau secondaire optionnel + contenu. */
export default function AppLayout({ children, breadcrumbs, title, actions, panel, panelTitle }: AppLayoutProps) {
    const { auth, apps } = usePage<SharedData>().props;
    const path = usePage().url.split('?')[0];
    const { appearance, updateAppearance } = useAppearance();
    const initials = useInitials();
    const heading = title ?? breadcrumbs?.at(-1)?.title ?? '';
    const isActive = (href: string) => path.startsWith(new URL(href).pathname);

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex min-h-svh">
                <nav aria-label="Applications" className="bg-sidebar border-sidebar-border sticky top-0 flex h-svh w-[52px] shrink-0 flex-col items-center gap-1 border-r py-2.5">
                    <Link href={route('home')} aria-label="Accueil" className="bg-sidebar-primary text-sidebar-primary-foreground mb-2 grid size-[34px] place-items-center rounded-lg font-semibold">
                        S
                    </Link>
                    <RailItem label="Mes applications">
                        <Link href={route('home')} aria-label="Mes applications" className={cn(railBtn, path === '/' && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
                            <LayoutGrid className="size-[18px]" />
                        </Link>
                    </RailItem>
                    {apps.map((app) => {
                        const Icon = appIcons[app.icon];
                        return (
                            <RailItem key={app.key} label={app.href ? app.name : `${app.name} (à venir)`}>
                                {app.href ? (
                                    <Link href={app.href} aria-label={app.badge ? `${app.name}, ${app.badge} à voir` : app.name} className={cn(railBtn, 'relative', isActive(app.href) && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
                                        <Icon className="size-[18px]" />
                                        {app.badge > 0 && <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold">{app.badge > 9 ? '9+' : app.badge}</span>}
                                    </Link>
                                ) : (
                                    <span aria-label={`${app.name} (à venir)`} className={cn(railBtn, 'opacity-45 hover:bg-transparent')}>
                                        <Icon className="size-[18px]" />
                                    </span>
                                )}
                            </RailItem>
                        );
                    })}
                    <span className="flex-1" />
                    <DropdownMenu>
                        <DropdownMenuTrigger aria-label="Changer de thème" className={railBtn}>
                            <Palette className="size-[18px]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end" className="min-w-40">
                            <DropdownMenuLabel>Thème</DropdownMenuLabel>
                            {themes.map(({ value, icon: Icon, label }) => (
                                <DropdownMenuItem key={value} onClick={() => updateAppearance(value)}>
                                    <Icon className="mr-2 size-4" />
                                    {label}
                                    {appearance === value && <Check className="ml-auto size-4" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger aria-label="Mon compte" className="bg-sidebar-primary text-sidebar-primary-foreground grid size-[30px] place-items-center rounded-full text-[11px] font-semibold">
                            {initials(auth.user.name)}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end" className="min-w-56">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </nav>

                <div className={cn('grid min-w-0 flex-1 content-start', panel && 'md:grid-cols-[290px_minmax(0,1fr)] md:content-stretch')}>
                    {panel && (
                        <aside className="min-w-0 border-b md:border-r md:border-b-0">
                            <div className="flex h-[50px] items-center border-b px-4 text-sm font-semibold">{panelTitle}</div>
                            {panel}
                        </aside>
                    )}
                    <main className="min-w-0">
                        <header className="flex h-[50px] items-center gap-2 border-b px-4">
                            <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{heading}</h1>
                            {actions}
                        </header>
                        <div className="grid gap-4 p-4 pb-10">{children}</div>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
