import { useAnimatedText } from '../hooks/useAnimatedText';

interface StageProps {
  title: string;
  subtitle: string;
}

export function Stage({ title, subtitle }: StageProps) {
  const [displayedTitle, titlePhase] = useAnimatedText(title);
  const [displayedSubtitle, subtitlePhase] = useAnimatedText(subtitle);

  return (
    <section className="stage">
      <div className="brand">
        <img src="/assets/logo.png" alt="" width={118} height={120} />
        <div className="wordmark">
          auth<span>.system</span>
        </div>
      </div>

      <div>
        <h1 className="display" data-phase={titlePhase}>
          {displayedTitle}
        </h1>
        <p className="display-meta" data-phase={subtitlePhase}>
          {displayedSubtitle}
        </p>
      </div>
    </section>
  );
}
