import { useState, useEffect } from 'react';

export const useLowStimulus = () => {
  const [isLowStimulus, setIsLowStimulus] = useState(() => {
    return localStorage.getItem('prikkelarm') === 'true';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLowStimulus(localStorage.getItem('prikkelarm') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('prikkelarm-changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('prikkelarm-changed', handleStorageChange);
    };
  }, []);

  const toggle = () => {
    const newValue = !isLowStimulus;
    setIsLowStimulus(newValue);
    localStorage.setItem('prikkelarm', String(newValue));
    window.dispatchEvent(new Event('prikkelarm-changed'));
  };

  const setLowStimulusValue = (value: boolean) => {
    setIsLowStimulus(value);
    localStorage.setItem('prikkelarm', String(value));
    window.dispatchEvent(new Event('prikkelarm-changed'));
  };

  return { isLowStimulus, toggle, setLowStimulusValue };
};
