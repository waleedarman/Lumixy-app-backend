import type { ReactElement } from 'react';

type IconProps = { className?: string; size?: number };

function base({ className, size = 20 }: IconProps) {
  return { className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
}

export function IconDashboard(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-9h7V4h-7v7Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 19V9M12 19V5M19 19v-7" strokeLinecap="round" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6" />
      <path d="m17 17 4 4" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4a4 4 0 0 0-4 4v2.5L6 13h12l-2-2.5V8a4 4 0 0 0-4-4Z" strokeLinejoin="round" />
      <path d="M10 17a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMap(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5 4 7v12l5-2 6 2 5-2V5l-5 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 5v12M15 7v12" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14.5 20a4.5 4.5 0 0 1 7 0" strokeLinecap="round" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 7V5a2 2 0 0 1 2-2h5v18h-5a2 2 0 0 1-2-2v-2" strokeLinejoin="round" />
      <path d="M4 12h10M7 9l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" strokeLinecap="round" />
      <path d="M20 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5L17 12.5 21 14v3a2 2 0 0 1-2 2A15 15 0 0 1 6 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWhatsApp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4a8 8 0 0 0-6.93 12.02L4 20l4.1-1.05A8 8 0 1 0 12 4Z" strokeLinejoin="round" />
      <path d="M9.5 10.5c.3.6 1.1 1.8 2.3 2.5 1 .6 1.8.8 2.1.9" strokeLinecap="round" />
    </svg>
  );
}

export function IconInstagram(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" />
    </svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m6 17 4-4 3 3 2-2 3 3" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUserPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" strokeLinecap="round" />
      <path d="M19 8v6M16 11h6" strokeLinecap="round" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlertCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 10v4h3l5 4V6L8 10H5Z" strokeLinejoin="round" />
      <path d="M16 9a3 3 0 0 1 0 6" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4 12 16-7-4 7 4 7-16-7Z" strokeLinejoin="round" />
      <path d="m8 12 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.6 10.6A2.5 2.5 0 0 0 12 15a2.5 2.5 0 0 0 1.4-.4" strokeLinecap="round" />
      <path d="M6.7 6.7C4.7 8.1 3.2 10 2.5 12c0 0 3.5 6 9.5 6 1.8 0 3.4-.5 4.7-1.3M17.9 14.1c1.6-1.3 2.8-2.9 3.6-4.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUserCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 11-3" strokeLinecap="round" />
      <path d="m16 11 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCalendarClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
      <circle cx="12" cy="15" r="3" />
      <path d="M12 13.5V15l1 1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCalendarX(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
      <path d="m10 14 4 4M14 14l-4 4" strokeLinecap="round" />
    </svg>
  );
}

export function IconClipboardCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="4" width="10" height="4" rx="1" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <rect x="5" y="6" width="14" height="15" rx="2" />
      <path d="m9 13 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

export function IconBriefcase(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M4 13h16" />
    </svg>
  );
}

export function IconExternalLink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14 19 5" strokeLinecap="round" />
      <path d="M19 10v9H5V5h9" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconScanSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7V5a1 1 0 0 1 1-1h2" strokeLinecap="round" />
      <path d="M20 7V5a1 1 0 0 0-1-1h-2" strokeLinecap="round" />
      <path d="M4 17v2a1 1 0 0 0 1 1h2" strokeLinecap="round" />
      <path d="M20 17v2a1 1 0 0 1-1 1h-2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="3.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSlidersHorizontal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h10M4 17h6M4 12h16" strokeLinecap="round" />
      <circle cx="17" cy="7" r="2" />
      <circle cx="13" cy="12" r="2" />
      <circle cx="11" cy="17" r="2" />
    </svg>
  );
}

const NAV_ICON_MAP: Record<string, (props: IconProps) => ReactElement> = {
  dashboard: IconDashboard,
  providers: IconUsers,
  subscriptions: IconChart,
  search: IconSearch,
  notifications: IconBell,
  categories: IconGrid,
  cities: IconMap,
  account: IconUser,
  admins: IconUsers,
};

export function NavIcon({ to, ...props }: IconProps & { to: string }) {
  const Icon = NAV_ICON_MAP[to] ?? IconGrid;
  return <Icon {...props} />;
}
