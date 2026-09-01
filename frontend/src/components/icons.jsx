// Lightweight inline icon set (stroke-based, inherits currentColor).
const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const make = (paths) => function Icon({ size = 16, className = '', ...rest }) {
  return (
    <svg {...base} width={size} height={size} className={className} aria-hidden="true" {...rest}>
      {paths}
    </svg>
  );
};

export const IconUser = make(<><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></>);
export const IconWrench = make(<path d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.1 2.1 0 0 1-3-3l8.4-8.4a4 4 0 0 0-5-5l3 3-2 2-3-3a4 4 0 0 0 5 5" />);
export const IconChart = make(<><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="5" width="3" height="13" /></>);
export const IconPlus = make(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
export const IconCheck = make(<path d="M20 6 9 17l-5-5" />);
export const IconStar = make(<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />);
export const IconClock = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconMapPin = make(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>);
export const IconRupee = make(<><path d="M6 4h12" /><path d="M6 9h12" /><path d="M9 4c4 0 6 2.5 6 5s-2 5-6 5H6l7 6" /></>);
export const IconBell = make(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>);
export const IconRefresh = make(<><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>);
export const IconBriefcase = make(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>);
export const IconChevron = make(<path d="m6 9 6 6 6-6" />);
export const IconAlert = make(<><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>);
export const IconX = make(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const IconInfo = make(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>);
