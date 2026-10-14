import { Suspense } from "react";
import { LoginForm } from "./login-form";

// LoginForm reads ?error / ?next (request-time data), so it must render inside <Suspense>.
export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
