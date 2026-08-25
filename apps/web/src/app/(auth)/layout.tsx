/**
 * Chrome for the (auth) group: minimal, centered, no app navigation.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <main className="w-full max-w-md">{children}</main>
    </div>
  );
}
