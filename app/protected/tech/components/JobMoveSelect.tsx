'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type TechJobMoveDestination = 'admin';

export type TechMoveNote = 'Job done' | 'Job incomplete';

export type TechMoveSelection = {
  destination: TechJobMoveDestination;
  note: TechMoveNote;
};

const MOVE_OPTIONS: { value: TechMoveNote; label: string }[] = [
  { value: 'Job done', label: 'Job done' },
  { value: 'Job incomplete', label: 'Job incomplete' },
];

type JobMoveSelectProps = {
  disabled?: boolean;
  isMoving?: boolean;
  onMove: (destination: TechJobMoveDestination, note: TechMoveNote) => void;
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
      onValueChange={(value) => onMove('admin', value as TechMoveNote)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={isMoving ? 'Moving...' : 'Move to Admin'} />
      </SelectTrigger>
      <SelectContent>
        {MOVE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
