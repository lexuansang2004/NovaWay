interface ComingSoonPageProps {
  title: string;
}

// Placeholder cho các route đã có trong Sidebar nhưng tính năng thuộc step
// sau (2.3 vehicle UI, 3.2 live map, 6.1 mismatch, 7.x trip logs/analytics...).
export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="text-sm text-slate-400">Tính năng này sẽ có ở bước triển khai tiếp theo.</p>
    </div>
  );
}
