type EventPanelStateProps = {
  loading?: boolean;
  emptyText: string;
  loadingText: string;
};

export default function EventPanelState({
  loading = false,
  emptyText,
  loadingText,
}: EventPanelStateProps) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-3 text-center text-sm font-medium text-slate-500">
      {loading ? (
        <>
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#3AB8EE]"
            aria-hidden="true"
          />
          <span>{loadingText}</span>
        </>
      ) : (
        <span>{emptyText}</span>
      )}
    </div>
  );
}
