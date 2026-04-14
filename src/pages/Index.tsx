import { useAuthContext } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { SessionsPage } from './SessionsPage';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, homegame, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !homegame) {
    return <AuthPage />;
  }

  return (
    <MainLayout>
      <SessionsPage />
    </MainLayout>
  );
};

export default Index;
