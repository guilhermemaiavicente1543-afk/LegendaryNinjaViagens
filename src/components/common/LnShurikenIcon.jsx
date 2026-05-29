export default function LnShurikenIcon({ className = "", decorative = true }) {
  return (
    <span className={`ln-shuriken-icon ${className}`} aria-hidden={decorative}>
      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="#b8b8b8"
          stroke="#333"
          strokeWidth="10"
          strokeLinejoin="round"
          d="M324.52 191.715a97.542 97.542 0 0 0-4.228-4.229L256 22.303l-64.291 165.183a93.225 93.225 0 0 0-4.222 4.224L22.301 255.998l165.179 64.291a97.542 97.542 0 0 0 4.229 4.229L256 489.697l64.284-165.174a95.208 95.208 0 0 0 4.237-4.233l165.178-64.287z"
        />

        <path
          fill="#d4d4d4"
          stroke="#555"
          strokeWidth="4"
          d="M324.52 191.715a97.542 97.542 0 0 0-4.228-4.229L256 22.303l-64.291 165.183a93.225 93.225 0 0 0-4.222 4.224L22.301 255.998l165.179 64.291a97.542 97.542 0 0 0 4.229 4.229L256 489.697l64.284-165.174a95.208 95.208 0 0 0 4.237-4.233l165.178-64.287z"
        />

        <circle cx="256" cy="256" r="52" fill="#1a1a1a" stroke="#444" strokeWidth="14" />
        <circle cx="256" cy="256" r="38" fill="none" stroke="#888" strokeWidth="6" />

        <circle cx="256" cy="78" r="10" fill="#444" />
        <circle cx="256" cy="434" r="10" fill="#444" />
        <circle cx="78" cy="256" r="10" fill="#444" />
        <circle cx="434" cy="256" r="10" fill="#444" />
      </svg>
    </span>
  );
}
