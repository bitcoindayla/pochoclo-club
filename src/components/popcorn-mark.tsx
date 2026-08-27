export function PopcornMark({ className }: { className?: string } = {}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 36"
    >
      <ellipse cx="9.2" cy="30.8" fill="#e8c36a" stroke="#f4f1ea" strokeWidth="1.5" rx="2.3" ry="2.3" />
      <ellipse cx="22.6" cy="29.6" fill="#e8c36a" stroke="#f4f1ea" strokeWidth="1.5" rx="2.1" ry="2.1" />
      <path
        d="M8.4 14.2h15.2l-1.7 14.2H10.1Z"
        fill="#f4f1ea"
        stroke="#f4f1ea"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path d="M11.2 14.4 9.9 28.2h3.3l1.1-13.8Z" fill="#ff5538" />
      <path d="M17.6 14.4 16.5 28.2h3.3l1.1-13.8Z" fill="#ff5538" />
      <path d="M23.2 14.4 21.6 28.2h1.9l1.5-13.8Z" fill="#ff5538" />
      <ellipse cx="11.2" cy="9.2" fill="#e8c36a" stroke="#f4f1ea" strokeWidth="1.5" rx="3.1" ry="2.8" />
      <ellipse cx="16.2" cy="7.4" fill="#e8c36a" stroke="#f4f1ea" strokeWidth="1.5" rx="3.4" ry="3.1" />
      <ellipse cx="21.2" cy="9.4" fill="#e8c36a" stroke="#f4f1ea" strokeWidth="1.5" rx="3" ry="2.7" />
      <ellipse cx="16.4" cy="11.6" fill="#e8c36a" stroke="#f4f1ea" strokeWidth="1.5" rx="3.6" ry="2.6" />
    </svg>
  );
}
