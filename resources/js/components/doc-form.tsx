import { fieldClass, thClass } from '@/components/sy';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { type ReactNode } from 'react';

// Le contenu d'un document est un objet libre, propre à chaque modèle (voir config/documents.php).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Data = Record<string, any>;
export type FormApi = { d: Data; set: (key: string, value: unknown) => void; canWrite: boolean };

/** Ce qu'un modèle de document fournit à l'assistant : ses étapes, ses champs et son aperçu. */
export type DocForm = {
    subtitle: string;
    steps: string[];
    /** Une phrase par étape : à quoi elle sert et ce qu'on attend. */
    intros: string[];
    contextIntro: string;
    context?: (f: FormApi) => ReactNode;
    step: (index: number, f: FormApi) => ReactNode;
    preview: (d: Data) => [string, ReactNode][];
};

type Column = { key: string; label: string; placeholder?: string; type?: string; options?: string[]; narrow?: boolean };
const cell = 'border-input bg-background h-8 w-full min-w-32 rounded-md border px-2 text-sm disabled:opacity-60';

const Hint = ({ children }: { children?: string }) => (children ? <span className="text-muted-foreground text-xs font-normal">{children}</span> : null);

export function Field({ label, children, wide, hint }: { label: string; children: ReactNode; wide?: boolean; hint?: string }) {
    return (
        <label className={`grid content-start gap-1.5 text-[13px] font-medium ${wide ? 'sm:col-span-2' : ''}`}>
            {label}
            {children}
            <Hint>{hint}</Hint>
        </label>
    );
}

export function Text({ f, k, label, hint, ...props }: { f: FormApi; k: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <Field label={label} hint={hint}>
            <input className={fieldClass} value={f.d[k] ?? ''} disabled={!f.canWrite} onChange={(e) => f.set(k, e.target.value)} {...props} />
        </Field>
    );
}

export function Area({ f, k, label, placeholder, hint }: { f: FormApi; k: string; label: string; placeholder?: string; hint?: string }) {
    return (
        <Field label={label} wide hint={hint}>
            <textarea className={`${fieldClass} h-auto py-2`} rows={3} placeholder={placeholder} value={f.d[k] ?? ''} disabled={!f.canWrite} onChange={(e) => f.set(k, e.target.value)} />
        </Field>
    );
}

export function Choice({ f, k, label, options, hint }: { f: FormApi; k: string; label: string; options: string[]; hint?: string }) {
    return (
        <Field label={label} hint={hint}>
            <select className={fieldClass} value={f.d[k] ?? options[0]} disabled={!f.canWrite} onChange={(e) => f.set(k, e.target.value)}>
                {options.map((o) => <option key={o}>{o}</option>)}
            </select>
        </Field>
    );
}

export function Check({ f, k, label }: { f: FormApi; k: string; label: string }) {
    return (
        <label className="flex items-center gap-2 text-[13px] font-medium">
            <input type="checkbox" className="size-4" disabled={!f.canWrite} checked={!!f.d[k]} onChange={(e) => f.set(k, e.target.checked)} />
            {label}
        </label>
    );
}

/** Cases à cocher stockées sous forme de liste de valeurs. */
export function CheckList({ f, k, label, options }: { f: FormApi; k: string; label: string; options: string[] }) {
    const values: string[] = f.d[k] ?? [];
    return (
        <fieldset className="grid content-start gap-2 sm:col-span-2">
            <legend className="mb-1.5 text-[13px] font-medium">{label}</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
                {options.map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4" disabled={!f.canWrite} checked={values.includes(o)} onChange={() => f.set(k, values.includes(o) ? values.filter((v) => v !== o) : options.filter((x) => x === o || values.includes(x)))} />
                        {o}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

/** Tableau de lignes éditables (VLAN, flux, composants, décisions…). */
export function Rows({ f, k, columns, add, blank, title, hint }: { f: FormApi; k: string; columns: Column[]; add: string; blank: Data; title?: string; hint?: string }) {
    const rows: Data[] = f.d[k] ?? [];
    const patch = (i: number, key: string, value: string) => f.set(k, rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
    return (
        <div className="grid gap-3 sm:col-span-2">
            {(title || hint) && (
                <div className="grid gap-0.5">
                    {title && <h3 className="text-[13px] font-semibold">{title}</h3>}
                    <Hint>{hint}</Hint>
                </div>
            )}
            {rows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                {columns.map((c) => <th key={c.key} className={thClass}>{c.label}</th>)}
                                <th className={thClass} />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i} className="[&:last-child>td]:border-b-0">
                                    {columns.map((c) => (
                                        <td key={c.key} className="border-b p-1.5">
                                            {c.options ? (
                                                <select aria-label={c.label} className={cell} disabled={!f.canWrite} value={row[c.key]} onChange={(e) => patch(i, c.key, e.target.value)}>
                                                    {c.options.map((o) => <option key={o}>{o}</option>)}
                                                </select>
                                            ) : (
                                                <input aria-label={c.label} type={c.type} placeholder={c.placeholder} className={`${cell} ${c.narrow ? '!min-w-16' : ''}`} disabled={!f.canWrite} value={row[c.key] ?? ''} onChange={(e) => patch(i, c.key, e.target.value)} />
                                            )}
                                        </td>
                                    ))}
                                    <td className="border-b p-1.5">
                                        {f.canWrite && <Button variant="ghost" size="sm" aria-label="Retirer cette ligne" onClick={() => f.set(k, rows.filter((_, j) => j !== i))}><Trash2 /></Button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {f.canWrite && <div><Button variant="outline" size="sm" onClick={() => f.set(k, [...rows, blank])}><Plus /> {add}</Button></div>}
        </div>
    );
}
