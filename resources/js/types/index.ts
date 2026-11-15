import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    auth: Auth;
    apps: AppDef[];
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'user' | 'viewer';
    apps: string[] | null;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface AppDef {
    key: string;
    name: string;
    verb: string;
    tagline: string;
    icon: string;
    color: string;
    href: string | null;
    ownerOnly: boolean;
}
