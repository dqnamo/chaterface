const LOGO_PATTERN = [
  false, true, true,
  true, false, false,
  false, true, false,
  true, false, false,
];

type LogoProps = {
  size?: number;
};

export default function Logo({ size = 4 }: LogoProps) {
  const cellStyle = { width: size, height: size };

  return (
    <div className="grid grid-cols-3 w-max" aria-hidden="true">
      {LOGO_PATTERN.map((isFilled, index) => (
        <div
          key={index}
          className={isFilled ? 'bg-accent-9' : 'bg-transparent'}
          style={cellStyle}
        />
      ))}
    </div>
  );
}