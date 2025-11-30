import AuthButton from './AuthButton';

export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="p-8 bg-card rounded-lg shadow-md text-center">
        <h1 className="text-1xl font-bold text-foreground mb-4">Welcome to the AI Chat Platform</h1>
        <p className="text-muted-foreground mb-6">Please sign in with your Google account to continue.</p>
        <AuthButton />
      </div>
    </div>
  );
}
