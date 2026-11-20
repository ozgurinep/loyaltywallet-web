import type { SegmentName } from '../interfaces/Rfm';
import { SEGMENT_METAS } from '../utils/rfm';

interface SegmentBadgeProps {
  segment: SegmentName | string;
  onClick?: () => void;
  className?: string;
  showDot?: boolean;
}

export default function SegmentBadge({
  segment,
  onClick,
  className = '',
  showDot = true,
}: SegmentBadgeProps) {
  const meta = SEGMENT_METAS[segment as SegmentName] ?? {
    labelTr: segment,
    bgLight: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    color: '#6B7280',
  };

  return (
    <span
      onClick={onClick}
      title={meta.description}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
        meta.bgLight
      } ${meta.textColor} ${meta.borderColor} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      } ${className}`}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
      )}
      {meta.labelTr}
    </span>
  );
}
