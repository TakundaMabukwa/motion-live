'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type TechJobMoveDestination = 'admin';

const MOVE_DESTINATION_LABELS: Record<TechJobMoveDestination, string> = {
  admin: 'Admin',
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
        <SelectValue placeholder={isMoving ? 'Moving...' : 'Move to Admin'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
