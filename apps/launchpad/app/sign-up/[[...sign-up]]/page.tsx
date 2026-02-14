import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'radial-gradient(circle at top, #0a0e27 0%, #020617 45%, #000000 100%)',
    }}>
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-slate-800/80 border border-slate-600',
          },
        }}
        afterSignUpUrl="/"
        signInUrl="/sign-in"
      />
    </div>
  );
}
