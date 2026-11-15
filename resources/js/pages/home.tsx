import { IconTile, Pill } from '@/components/sy';
import AppLayout from '@/layouts/app-layout';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Home() {
    const { apps, auth } = usePage<SharedData>().props;
    const tile = 'bg-card grid gap-3 rounded-[14px] border p-4 text-left';

    return (
        <AppLayout title="Mes applications" actions={auth.user.role === 'owner' && <Pill>Propriétaire</Pill>}>
            <Head title="Mes applications" />
            {apps.length === 0 && <p className="text-muted-foreground text-sm">Aucune application ne t'est encore ouverte. Demande l'accès au propriétaire de la plateforme.</p>}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
                {apps.map((app) => {
                    const body = (
                        <>
                            <div className="flex items-center gap-3">
                                <IconTile icon={app.icon} color={app.color} />
                                <div>
                                    <span className="text-muted-foreground block text-sm">{app.verb}</span>
                                    <span className="block text-sm font-medium">{app.name}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-muted-foreground">{app.tagline}</span>
                                {!app.href ? <Pill>À venir</Pill> : app.ownerOnly ? <Pill>Propriétaire seul</Pill> : <Pill tone="success">Actif</Pill>}
                            </div>
                        </>
                    );
                    return app.href ? (
                        <Link key={app.key} href={app.href} className={`${tile} hover:border-muted-foreground transition-colors`}>
                            {body}
                        </Link>
                    ) : (
                        <div key={app.key} className={`${tile} opacity-60`}>
                            {body}
                        </div>
                    );
                })}
            </div>
        </AppLayout>
    );
}
