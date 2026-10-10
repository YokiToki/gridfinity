import type { ModeId } from './modes'

/** Изометрические иллюстрации карточек стартовой страницы (design/artboards/Main.dc.html). */
export function ModeArt({ id }: { id: ModeId }) {
  const props = { width: 240, height: id === 'box' ? 165 : 150, viewBox: `0 0 250 ${id === 'box' ? 165 : 150}`, 'aria-hidden': true, className: 'transition-transform group-hover:-translate-y-1 group-hover:scale-105' } as const
  if (id === 'box') return (<svg {...props}>
            <g transform="translate(100 32)">
              <g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#222B3B"/></g>
              <g transform="matrix(.866 .5 -.866 .5 0 0)" fill="none"><rect x="5" y="5" width="140" height="90" rx="4" stroke="#3D4A63" strokeWidth="10"/></g>
              <g transform="translate(0 -3)"><g transform="matrix(.866 .5 -.866 .5 0 0)" fill="none"><rect x="5" y="5" width="140" height="90" rx="4" stroke="#43516C" strokeWidth="10"/><path d="M75 5V95" stroke="#43516C" strokeWidth="5"/></g></g>
              <g transform="translate(0 -6)"><g transform="matrix(.866 .5 -.866 .5 0 0)" fill="none"><rect x="5" y="5" width="140" height="90" rx="4" stroke="#4A5A78" strokeWidth="10"/><path d="M75 5V95" stroke="#4A5A78" strokeWidth="5"/></g></g>
              <g transform="translate(0 -9)"><g transform="matrix(.866 .5 -.866 .5 0 0)" fill="none"><rect x="5" y="5" width="140" height="90" rx="4" stroke="#53648A" strokeWidth="10"/><path d="M75 5V95" stroke="#53648A" strokeWidth="5"/></g></g>
              <g transform="translate(0 -12)"><g transform="matrix(.866 .5 -.866 .5 0 0)" fill="none"><rect x="5" y="5" width="140" height="90" rx="4" stroke="#5E7194" strokeWidth="10"/><path d="M75 5V95" stroke="#5E7194" strokeWidth="5"/></g></g>
              <g transform="translate(0 -15)"><g transform="matrix(.866 .5 -.866 .5 0 0)" fill="none"><rect x="5" y="5" width="140" height="90" rx="4" stroke="#6A7EA2" strokeWidth="10"/><path d="M75 5V95" stroke="#6A7EA2" strokeWidth="5"/></g></g>
              <g transform="translate(0 -18)"><g transform="matrix(.866 .5 -.866 .5 0 0)" fill="none"><rect x="5" y="5" width="140" height="90" rx="4" stroke="#7889AE" strokeWidth="10"/><path d="M75 5V95" stroke="#7889AE" strokeWidth="5"/></g></g>
              <g transform="translate(0 -21)"><g transform="matrix(.866 .5 -.866 .5 0 0)" fill="none"><rect x="5" y="5" width="140" height="90" rx="4" stroke="#8FA3C4" strokeWidth="10"/><path d="M75 5V95" stroke="#8FA3C4" strokeWidth="5"/></g></g>
            </g>
          </svg>)
  if (id === 'baseplate') return (<svg {...props}>
            <g transform="translate(100 6)">
              <g transform="translate(0 10)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#39465E"/></g></g>
              <g transform="translate(0 8)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#3F4D67"/></g></g>
              <g transform="translate(0 6)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#43516C"/></g></g>
              <g transform="translate(0 4)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#46546F"/></g></g>
              <g transform="translate(0 2)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#4A5A78"/></g></g>
              <g transform="matrix(.866 .5 -.866 .5 0 0)">
                <rect width="150" height="100" rx="6" fill="#8FA3C4" stroke="#B3C2DB" strokeWidth="1.2"/>
                <g fill="#5E7295"><rect x="6" y="6" width="38" height="38" rx="6"/><rect x="56" y="6" width="38" height="38" rx="6"/><rect x="106" y="6" width="38" height="38" rx="6"/><rect x="6" y="56" width="38" height="38" rx="6"/><rect x="56" y="56" width="38" height="38" rx="6"/><rect x="106" y="56" width="38" height="38" rx="6"/></g>
                <g fill="#1B2232" stroke="#B3C2DB" strokeWidth="1"><circle cx="13" cy="13" r="3.5"/><circle cx="137" cy="13" r="3.5"/><circle cx="13" cy="87" r="3.5"/><circle cx="137" cy="87" r="3.5"/></g>
              </g>
            </g>
          </svg>)
  return (<svg {...props}>
            <defs><clipPath id="cpo"><rect x="22" y="35" width="74" height="30" rx="15"/><circle cx="104" cy="50" r="19"/></clipPath></defs>
            <g transform="translate(100 6)">
              <g transform="translate(0 10)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#39465E"/></g></g>
              <g transform="translate(0 8)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#3F4D67"/></g></g>
              <g transform="translate(0 6)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#43516C"/></g></g>
              <g transform="translate(0 4)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#46546F"/></g></g>
              <g transform="translate(0 2)"><g transform="matrix(.866 .5 -.866 .5 0 0)"><rect width="150" height="100" rx="6" fill="#4A5A78"/></g></g>
              <g transform="matrix(.866 .5 -.866 .5 0 0)">
                <rect width="150" height="100" rx="6" fill="#8FA3C4" stroke="#B3C2DB" strokeWidth="1.2"/>
                <path d="M50 3V97M100 3V97M3 50H147" stroke="#7388AC" strokeWidth="1"/>
                <g fill="#2A3350"><rect x="22" y="35" width="74" height="30" rx="15"/><circle cx="104" cy="50" r="19"/></g>
                <g clipPath="url(#cpo)"><g transform="translate(6 6)" fill="#0B0F18"><rect x="22" y="35" width="74" height="30" rx="15"/><circle cx="104" cy="50" r="19"/></g></g>
                <g fill="none" stroke="#7C9CFF" strokeWidth="1.8"><rect x="22" y="35" width="74" height="30" rx="15"/><circle cx="104" cy="50" r="19"/></g>
              </g>
            </g>
          </svg>)
}
