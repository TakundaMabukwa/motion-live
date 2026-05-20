'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type TechJobMoveDestination = 'inv' | 'admin' | 'fc';

const MOVE_DESTINATION_LABELS: Record<TechJobMoveDestination, string> = {
  inv: 'Inventory',
  admin: 'Admin',
  fc: 'FC',
};

type JobMoveSelectProps = {
  disabled?: boolean;
  isMoving?: boolean;
  onMove: (destination: TechJobMoveDestination) => void;
  className?: string;
};

export default function JobMoveSelect({
  disabled = false,
  isMoving = false,
  onMove,
  className = 'w-full',
}: JobMoveSelectProps) {
  return (
    <Select
      disabled={disabled || isMoving}
      onValueChange={(value) => onMove(value as TechJobMoveDestination)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={isMoving ? 'Moving...' : 'Move to...'} />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(MOVE_DESTINATION_LABELS) as TechJobMoveDestination[]).map(
          (destination) => (
            <SelectItem key={destination} value={destination}>
              {MOVE_DESTINATION_LABELS[destination]}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}
