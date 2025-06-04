import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width="120"
      height="30"
      aria-label="Gold Maq Control Logo"
      {...props}
    >
      <rect width="200" height="50" fill="transparent" />
      <text
        x="10"
        y="35"
        fontFamily="Poppins, sans-serif"
        fontSize="28"
        fontWeight="bold"
        fill="hsl(var(--primary))"
      >
        GoldMaq
      </text>
      <text
        x="135"
        y="35"
        fontFamily="Poppins, sans-serif"
        fontSize="28"
        fontWeight="normal"
        fill="hsl(var(--foreground))"
      >
        Ctrl
      </text>
    </svg>
  );
}
