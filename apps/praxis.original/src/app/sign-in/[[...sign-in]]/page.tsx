import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] py-8">
      <SignIn
        appearance={{
          variables: { colorPrimary: '#4f46e5', colorBackground: '#18181b', colorText: '#fff', colorInputBackground: '#27272a' },
          elements: { rootBox: 'mx-auto', card: 'bg-zinc-900 border border-zinc-800 shadow-xl' },
        }}
      />
    </div>
  );
}
