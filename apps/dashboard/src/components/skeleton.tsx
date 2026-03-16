type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  rounded?: string;
};

export function Skeleton({ width = '100%', height = 16, rounded = '8px' }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: rounded,
        background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%)',
        backgroundSize: '200% 100%',
        border: '1px solid var(--card-border)',
        animation: 'shimmer 1.5s infinite linear',
      }}
    />
  );
}
