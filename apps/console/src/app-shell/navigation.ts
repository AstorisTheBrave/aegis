import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Box,
  ClipboardCheck,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Network,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Workflow,
} from 'lucide-react';

export interface NavigationItem {
  readonly label: string;
  readonly icon: LucideIcon;
}

export const navigationItems = [
  { label: 'Inventory', icon: LayoutDashboard },
  { label: 'Findings', icon: ShieldCheck },
  { label: 'Reviews', icon: ClipboardCheck },
  { label: 'Access', icon: KeyRound },
  { label: 'Identities', icon: UsersRound },
  { label: 'Resources', icon: Box },
  { label: 'Policies', icon: ListChecks },
  { label: 'Workflows', icon: Workflow },
  { label: 'Actions', icon: GitBranch },
  { label: 'Assistant', icon: Bot },
  { label: 'Controls', icon: SlidersHorizontal },
  { label: 'Connectors', icon: Network },
  { label: 'Settings', icon: Settings },
] as const satisfies readonly NavigationItem[];

export type NavigationLabel = (typeof navigationItems)[number]['label'];

export function isNavigationLabel(value: string | null): value is NavigationLabel {
  return navigationItems.some((item) => item.label === value);
}
