const SHACKLE_PATH = {
  closed: 'M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5',
  open: 'M7.5 10.5V7a4.5 4.5 0 0 1 8.9-1',
} as const;

interface BadgeProps {
  isLocked: boolean;
}

export function Badge({ isLocked }: BadgeProps) {
  return (
    <div className="badge" data-state={isLocked ? 'locked' : 'unlocked'}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3.5" y="10.5" width="17" height="11" rx="2.5" />
        <path d={isLocked ? SHACKLE_PATH.closed : SHACKLE_PATH.open} />
      </svg>
    </div>
  );
}
