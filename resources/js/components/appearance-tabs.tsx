import { Appearance, useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { LucideIcon, Monitor, Moon, Sparkles, Sun } from 'lucide-react';
import { HTMLAttributes } from 'react';

export const themes: { value: Appearance; icon: LucideIcon; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Clair' },
    { value: 'dark', icon: Moon, label: 'Sombre' },
    { value: 'sykerio', icon: Sparkles, label: 'Sykerio' },
    { value: 'system', icon: Monitor, label: 'Système' },
];

export default function AppearanceToggleTab({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div className={cn('bg-muted inline-flex flex-wrap gap-1 rounded-lg p-1', className)} {...props}>
            {themes.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => updateAppearance(value)}
                    aria-pressed={appearance === value}
                    className={cn(
                        'flex items-center rounded-md px-3.5 py-1.5 text-sm transition-colors',
                        appearance === value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    <Icon className="mr-1.5 -ml-1 h-4 w-4" />
                    {label}
                </button>
            ))}
        </div>
    );
}
