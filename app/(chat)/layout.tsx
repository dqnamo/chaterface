export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh">
      <div className="absolute left-0 top-0 p-4">
        <p className="text-gray-10 text-sm">[Conversations]</p>
      </div>

      <div className="flex flex-col h-full w-full max-w-4xl mx-auto">
        {children}
      </div>
    </div>
  );
}
