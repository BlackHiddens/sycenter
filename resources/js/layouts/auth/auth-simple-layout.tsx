import AppLogoIcon from '@/components/app-logo-icon';
import GeoWaves from '@/components/geo-waves';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

/** Pages de connexion : fond de vagues géométriques en mouvement lent, formulaire sur une carte translucide. */
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
            <GeoWaves className="pointer-events-none absolute inset-0 -z-10 size-full" />
            <div className="bg-card/80 w-full max-w-sm rounded-[1.25rem] border p-7 shadow-sm backdrop-blur-md md:p-8">
                <div className="flex flex-col gap-7">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={route('home')} aria-label="Sycenter">
                            <AppLogoIcon className="size-12" />
                        </Link>
                        <div className="space-y-1.5 text-center">
                            <h1 className="text-xl font-medium text-balance">{title}</h1>
                            <p className="text-muted-foreground text-center text-sm">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
