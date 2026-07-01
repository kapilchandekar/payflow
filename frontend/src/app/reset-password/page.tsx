import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export const metadata = {
  title: 'Reset Password - PayFlow',
  description: 'Set a new password for your PayFlow account',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding / Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-auth-gradient mesh-overlay relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Top */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">PayFlow</span>
            </div>
          </div>

          {/* Center content */}
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Almost there.
              <br />
              <span className="text-white/70">Secure your account.</span>
            </h2>
            <p className="text-white/60 text-lg max-w-md leading-relaxed">
              Create a strong password to ensure your financial data remains safe and protected.
            </p>
          </div>

          {/* Bottom */}
          <div className="text-sm text-white/40">
            © 2026 PayFlow. Intelligent Finance Platform.
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 animate-float" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/3" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[420px]">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
