type Props = {
  imageUrl?: string | null;
  memberNumber: number;
  name: string;
  compact?: boolean;
};

export default function StagePortrait({ imageUrl, memberNumber, name, compact = false }: Props) {
  const number = `#${String(memberNumber).padStart(4, "0")}`;
  return (
    <div className={`stage-portrait ${compact ? "stage-portrait-compact" : ""}`}>
      <div
        className="stage-portrait-photo"
        role="img"
        aria-label={imageUrl ? `${name}'s profile photo` : `${name}'s StageFront portrait`}
        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
      >
        {!imageUrl ? <span aria-hidden="true">SF</span> : null}
      </div>
      <div className="stage-curtain stage-curtain-left" aria-hidden="true" />
      <div className="stage-curtain stage-curtain-right" aria-hidden="true" />
      <div className="stage-valance" aria-hidden="true" />
      <strong className="stage-member-number">{number}</strong>
    </div>
  );
}
