import { signIn } from "@/auth";
import { devLoginEnabled } from "@/auth.config";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">☕ Coffee Wheel</h1>
      <p>Sign in with your Visibuild Google account</p>
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
            await signIn("dev", {
              email: String(formData.get("email") ?? ""),
              redirectTo: "/",
            });
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
