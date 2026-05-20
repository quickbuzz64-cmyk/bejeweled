type ProductGridSkeletonProps = {
  count?: number;
  className?: string;
};

export function ProductGridSkeleton({
  count = 4,
  className = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8',
}: ProductGridSkeletonProps) {
  return (
    <div className={className} aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-3xl border bg-white"
          style={{
            borderColor: '#E5E7EB',
            boxShadow: '0 8px 28px rgba(91, 30, 110, 0.08)',
          }}
        >
          <div className="aspect-square animate-pulse" style={{ backgroundColor: '#F0F4F0' }} />
          <div className="space-y-4 p-6">
            <div className="h-5 animate-pulse rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
            <div className="h-5 w-2/3 animate-pulse rounded-full" style={{ backgroundColor: '#F7E7EB' }} />
            <div className="h-11 animate-pulse rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
          </div>
        </article>
      ))}
    </div>
  );
}