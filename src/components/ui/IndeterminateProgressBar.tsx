import { cn } from "../../lib/utils";

type Props = {
  className?: string;
};

export default function IndeterminateProgressBar({ className }: Props) {
  return (
    <div
      className={cn("h-0.5 w-full overflow-hidden bg-gray-100 dark:bg-gray-700", className)}
      role="progressbar"
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full w-1/3 animate-indeterminate bg-primary-500" />
    </div>
  );
}
