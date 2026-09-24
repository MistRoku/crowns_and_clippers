interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: 'left' | 'center';
  light?: boolean;
}

export default function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  light = false,
}: SectionHeadingProps) {
  return (
    <div className={`section-heading ${align === 'center' ? 'align-center' : ''} ${light ? 'light' : ''}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {intro && <p className="section-intro">{intro}</p>}
    </div>
  );
}
