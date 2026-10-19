import { Suspense } from "react";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { devLoginEnabled } from "@/auth.config";

async function ErrorNotice({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return <p role="alert">Only Visibuild Google accounts can sign in.</p>;
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">☕ Coffee Wheel</h1>
      <p>Sign in with your Visibuild Google account</p>
      <Suspense>
        <ErrorNotice searchParams={searchParams} />
      </Suspense>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Sign in with Google
        </button>
      </form>
      {devLoginEnabled && (
        <form
          className="flex flex-col gap-2"
          action={async (formData: FormData) => {
            "use server";
            try {
              await signIn("dev", {
                email: String(formData.get("email") ?? ""),
                redirectTo: "/",
              });
            } catch (e) {
              if (e instanceof AuthError) redirect("/signin?error=" + e.type);
              throw e; // includes the redirect thrown on success
            }
          }}
        >
          <input
            name="email"
            type="email"
            required
            placeholder="you@visibuild.com"
            className="rounded border px-3 py-2"
          />
          <button type="submit" className="rounded border px-4 py-2">
            Dev login
          </button>
        </form>
      )}
    </main>
  );
}
