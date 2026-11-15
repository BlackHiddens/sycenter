import { fieldClass, Pill, tdClass, thClass } from '@/components/sy';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type User } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';

const roles = { owner: 'Propriétaire', user: 'Utilisateur', viewer: 'Lecture seule' };
type Grantable = { key: string; name: string };

export default function Users({ users, grantable }: { users: User[]; grantable: Grantable[] }) {
    const [editing, setEditing] = useState<User | 'new' | null>(null);
    const form = useForm({ name: '', email: '', password: '', role: 'user', apps: [] as string[] });
    const isNew = editing === 'new';

    const open = (u: User | 'new') => {
        form.clearErrors();
        form.setData(u === 'new' ? { name: '', email: '', password: '', role: 'user', apps: [] } : { name: u.name, email: u.email, password: '', role: u.role, apps: u.apps ?? [] });
        setEditing(u);
    };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (isNew) form.post(route('users.store'), options);
        else if (editing) form.put(route('users.update', editing.id), options);
    };
    const remove = (u: User) => confirm(`Retirer l'accès de ${u.name} ? Son compte et ses documents seront supprimés.`) && router.delete(route('users.destroy', u.id), { preserveScroll: true });
    const toggle = (key: string) => form.setData('apps', form.data.apps.includes(key) ? form.data.apps.filter((k) => k !== key) : [...form.data.apps, key]);
    const err = (k: keyof typeof form.errors) => form.errors[k] && <span className="text-danger text-xs font-normal">{form.errors[k]}</span>;

    return (
        <AppLayout title="Accès" actions={<Button size="sm" onClick={() => open('new')}>Ajouter un utilisateur</Button>}>
            <Head title="Accès" />
            <div className="bg-card overflow-x-auto rounded-[14px] border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3.5">
                    <div>
                        <h2 className="text-sm font-semibold">Utilisateurs</h2>
                        <p className="text-muted-foreground text-sm">Toi seul peux ajouter, retirer, et choisir les apps visibles par chacun.</p>
                    </div>
                    <Pill>{`${users.length} compte${users.length > 1 ? 's' : ''}`}</Pill>
                </div>
                <table className="w-full border-collapse text-sm">
                    <thead><tr>{['Utilisateur', 'E-mail', 'Rôle', 'Apps autorisées', ''].map((h) => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="[&:last-child>td]:border-b-0">
                                <td className={`${tdClass} font-semibold`}>{u.name}</td>
                                <td className={tdClass}>{u.email}</td>
                                <td className={tdClass}>{roles[u.role]}</td>
                                <td className={`${tdClass} space-x-1`}>
                                    {u.role === 'owner' ? 'Toutes' : (u.apps ?? []).length === 0 ? <span className="text-muted-foreground">Aucune</span> : grantable.filter((g) => u.apps?.includes(g.key)).map((g) => <Pill key={g.key}>{g.name}</Pill>)}
                                </td>
                                <td className={`${tdClass} space-x-1 text-right`}>
                                    {u.role !== 'owner' && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => open(u)}>Modifier</Button>
                                            <Button variant="outline" size="sm" onClick={() => remove(u)}>Retirer</Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent>
                    <form onSubmit={submit} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>{isNew ? 'Ajouter un utilisateur' : `Modifier ${form.data.name}`}</DialogTitle>
                            <DialogDescription>{isNew ? 'Tu lui transmets toi-même son mot de passe ; il pourra le changer ensuite.' : 'Laisse le mot de passe vide pour ne pas le changer.'}</DialogDescription>
                        </DialogHeader>
                        {isNew && (
                            <>
                                <label className="grid gap-1.5 text-[13px] font-medium">Nom<input className={fieldClass} required value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />{err('name')}</label>
                                <label className="grid gap-1.5 text-[13px] font-medium">E-mail<input className={fieldClass} type="email" required value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />{err('email')}</label>
                            </>
                        )}
                        <label className="grid gap-1.5 text-[13px] font-medium">Mot de passe<input className={fieldClass} type="password" autoComplete="new-password" required={isNew} minLength={8} value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />{err('password')}</label>
                        <label className="grid gap-1.5 text-[13px] font-medium">
                            Rôle
                            <select className={fieldClass} value={form.data.role} onChange={(e) => form.setData('role', e.target.value)}>
                                <option value="user">Utilisateur (crée et modifie)</option>
                                <option value="viewer">Lecture seule (consulte et télécharge)</option>
                            </select>
                        </label>
                        <fieldset className="grid gap-2">
                            <legend className="mb-1.5 text-[13px] font-medium">Apps autorisées</legend>
                            {grantable.map((g) => (
                                <label key={g.key} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={form.data.apps.includes(g.key)} onChange={() => toggle(g.key)} />{g.name}</label>
                            ))}
                        </fieldset>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
                            <Button type="submit" disabled={form.processing}>{isNew ? 'Ajouter' : 'Enregistrer'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
