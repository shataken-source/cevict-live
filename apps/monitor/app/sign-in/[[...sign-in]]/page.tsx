import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-slate-800/80 border border-slate-600',
          },
        }}
        afterSignInUrl="/"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
