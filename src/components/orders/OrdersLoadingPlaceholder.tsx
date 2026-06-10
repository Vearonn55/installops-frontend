import IndeterminateProgressBar from "../ui/IndeterminateProgressBar";

type Props = {
  message: string;
  showBar?: boolean;
};

export default function OrdersLoadingPlaceholder({ message, showBar = true }: Props) {
  return (
    <div>
      {showBar ? <IndeterminateProgressBar /> : null}
      <p className="px-4 py-8 text-center text-sm text-gray-500">{message}</p>
    </div>
  );
}
