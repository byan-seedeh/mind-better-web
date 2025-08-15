"use client"
import React from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF]'>
      <div className='text-[#432C81]'>
        <div className='text-3xl font-bold'>
          Welcome to
        </div>
        <div className='text-5xl font-bold'>
          MindBetter
        </div>
      </div>
      <div className='h-[20px]' />
      <img src='/assets/main-logo.png' className='w-[400px]' />
      <div className='h-[100px]' />
      <button className='bg-[#432C81] text-white py-[10px] w-[300px] rounded-[8px]'>Sign Up</button>
      <div className='h-[10px]' />
      <button className='bg-white text-black py-[10px] w-[300px] rounded-[8px]' onClick={() => router.push('/login')}>Login</button>
    </div>
  )
}
