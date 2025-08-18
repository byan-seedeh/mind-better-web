"use client"
import React from 'react'
import { useAuthen } from '@/utils/useAuthen';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  if (isLoading) {  
    return <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF]'>Loading...</div>;
  }

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF]'>
      <div className='text-[#432C81]'>
        <div className='text-3xl font-bold'>
          Welcome to
        </div>
        <div className='text-4xl font-bold'>
          MindBetter
        </div>
        <div className='h-4' />
        <div className='text-5xl font-bold'>
          {authenticated.email}
        </div>
        <div className='h-4' />
        <div className='text-5xl font-bold'>
          <button className='bg-white text-black py-[10px] w-[300px] rounded-[8px]' onClick={() => {
            localStorage.removeItem('user');
            router.push('/login');
          }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
