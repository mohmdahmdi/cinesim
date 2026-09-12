import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-2xl text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        This page doesn&apos;t exist — maybe it&apos;s not similar enough.
      </p>
      <Link href="/" className="mt-4 inline-block text-accent hover:underline">
        Back to Discover
      </Link>
    </div>
  );
}
