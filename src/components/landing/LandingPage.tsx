import React from 'react';
import { PublicLayout } from '../public/PublicLayout';

interface LandingPageProps {
  onOpenLogin: (tab: 'student' | 'officer', quickToken?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  return <PublicLayout onOpenLogin={onOpenLogin} />;
};

export default LandingPage;
