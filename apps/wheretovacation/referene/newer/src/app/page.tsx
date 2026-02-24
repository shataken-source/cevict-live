import React from 'react';
import AuthForm from './components/AuthForm';

export default function Home() {
  return (
    <div className='min-h-screen bg-gray-900 text-white p-8 flex justify-center items-center'>
      <AuthForm />
    </div>
  );
}
