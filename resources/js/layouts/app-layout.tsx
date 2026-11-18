import AppLogoIcon from '@/components/app-logo-icon';
import { themes } from '@/components/appearance-tabs';
import { appIcons } from '@/components/sy';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { useAppearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Check, LayoutGrid, Palette, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
    actions?: ReactNode;
    panel?: ReactNode;
    panelTitle?: string;
}

/** En dessous, le panneau de l'app n'a plus la place d'être une colonne : il s'ouvre en tiroir. */
const WIDE = '(min-width: 1400px)';

const railBtn =
    'grid size-[2.125rem] shrink-0 place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-sidebar-ring';

function RailItem({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="right" className="max-md:hidden">{label}</TooltipContent>
        </Tooltip>
    );
}

function useWide() {
    const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
    useEffect(() => {
        const mql = window.matchMedia(WIDE);
        const onChange = () => setWide(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    return wide;
}

const remembered = () => {
    try {
        return localStorage.getItem('panel-collapsed') === '1';
    } catch {
        return false;
    }
};

/**
 * Rail d'icônes (une par app) + panneau secondaire de l'app + contenu.
 * Grand écran : le panneau est une colonne repliable. Écran moyen ou petit : il s'ouvre en tiroir.
 * Téléphone : le rail devient une barre en bas de l'écran.
 */
export default function AppLayout({ children, breadcrumbs, title, actions, panel, panelTitle }: AppLayoutProps) {
    const { auth, apps } = usePage<SharedData>().props;
    const path = usePage().url.split('?')[0];
    const { appearance, updateAppearance } = useAppearance();
    const initials = useInitials();
    const heading = title ?? breadcrumbs?.at(-1)?.title ?? '';
    const isActive = (href: string) => path.startsWith(new URL(href).pathname);
    const wide = useWide();
    const mobile = useIsMobile();
    const [collapsed, setCollapsed] = useState(remembered);
    const [drawer, setDrawer] = useState(false);
    const column = !!panel && wide && !collapsed;
    const menuSide = mobile ? 'top' : 'right';

    const collapse = (value: boolean) => {
        setCollapsed(value);
        try {
            localStorage.setItem('panel-collapsed', value ? '1' : '0');
        } catch {
            /* préférence non mémorisée, sans gravité */
        }
    };
    const openPanel = () => (wide ? collapse(false) : setDrawer(true));

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex min-h-svh pb-14 md:pb-0">
                <nav aria-label="Applications"
                    className="bg-sidebar border-sidebar-border fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around gap-1 border-t px-2 pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-svh md:w-[3.25rem] md:shrink-0 md:flex-col md:justify-start md:border-t-0 md:border-r md:px-0 md:py-2.5">
                    <Link href={route('home')} aria-label="Accueil" className="mb-2 hidden md:block">
                        <AppLogoIcon className="size-[2.125rem]" />
                    </Link>
                    <RailItem label="Mes applications">
                        <Link href={route('home')} aria-label="Mes applications" className={cn(railBtn, path === '/' && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
                            <LayoutGrid className="size-[1.125rem]" />
                        </Link>
                    </RailItem>
                    {apps.map((app) => {
                        const Icon = appIcons[app.icon];
                        return (
                            <RailItem key={app.key} label={app.href ? app.name : `${app.name} (à venir)`}>
                                {app.href ? (
                                    <Link href={app.href} aria-label={app.badge ? `${app.name}, ${app.badge} à voir` : app.name} className={cn(railBtn, 'relative', isActive(app.href) && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
                                        <Icon className="size-[1.125rem]" />
                                        {app.badge > 0 && <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.625rem] leading-none font-semibold">{app.badge > 9 ? '9+' : app.badge}</span>}
                                    </Link>
                                ) : (
                                    <span aria-label={`${app.name} (à venir)`} className={cn(railBtn, 'opacity-45 hover:bg-transparent max-md:hidden')}>
                                        <Icon className="size-[1.125rem]" />
                                    </span>
                                )}
                            </RailItem>
                        );
                    })}
                    <span className="hidden flex-1 md:block" />
                    <DropdownMenu>
                        <DropdownMenuTrigger aria-label="Changer de thème" className={railBtn}>
                            <Palette className="size-[1.125rem]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side={menuSide} align="end" className="min-w-40">
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
                        <DropdownMenuTrigger aria-label="Mon compte" className="bg-sidebar-primary text-sidebar-primary-foreground grid size-[1.875rem] shrink-0 place-items-center rounded-full text-[0.6875rem] font-semibold">
                            {initials(auth.user.name)}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side={menuSide} align="end" className="min-w-56">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </nav>

                <div className={cn('grid min-w-0 flex-1 content-start', column && 'grid-cols-[16rem_minmax(0,1fr)] content-stretch')}>
                    {column && (
                        <aside className="min-w-0 border-r">
                            <div className="flex h-[3.125rem] items-center gap-2 border-b pr-2 pl-4 text-sm font-semibold">
                                <span className="min-w-0 flex-1 truncate">{panelTitle}</span>
                                <button onClick={() => collapse(true)} aria-label="Replier le panneau" title="Replier le panneau" className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-8 place-items-center rounded-md">
                                    <PanelLeftClose className="size-4" />
                                </button>
                            </div>
                            {panel}
                        </aside>
                    )}
                    <main className="min-w-0">
                        <header className="flex h-[3.125rem] items-center gap-2 border-b px-3 md:px-4">
                            {panel && !column && (
                                <button onClick={openPanel} aria-label={`Ouvrir le panneau ${panelTitle ?? ''}`} title={panelTitle}
                                    className="text-muted-foreground hover:bg-accent hover:text-foreground -ml-1 grid size-8 shrink-0 place-items-center rounded-md border">
                                    <PanelLeftOpen className="size-4" />
                                </button>
                            )}
                            <h1 className="min-w-0 flex-1 truncate text-[1.0625rem] font-semibold">{heading}</h1>
                            {actions}
                        </header>
                        <div className="grid gap-4 p-3 pb-10 md:p-4">{children}</div>
                    </main>
                </div>
            </div>

            {panel && !column && (
                <Sheet open={drawer} onOpenChange={setDrawer}>
                    <SheetContent side="left" aria-describedby={undefined} className="w-[17rem] gap-0 overflow-y-auto p-0 sm:max-w-[17rem] md:left-[3.25rem]">
                        <SheetTitle className="flex h-[3.125rem] items-center border-b px-4 text-sm font-semibold">{panelTitle}</SheetTitle>
                        {panel}
                    </SheetContent>
                </Sheet>
            )}
        </TooltipProvider>
    );
}
