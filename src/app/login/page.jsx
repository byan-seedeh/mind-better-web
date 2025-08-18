"use client"
import React, { useState } from 'react'
import * as Yup from 'yup';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { login } from '@/services/loginService';
import { showErrorDialog } from '@/utils/webDialog';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Invalid email format')
      .required('Email is required'),
    password: Yup.string()
      .required('Password is required'),
  });

  const handleSubmit = async (values) => {
    const response = await login(values.email, values.password);

    if (response.result) {
      localStorage.setItem('user', JSON.stringify(response.data));
      router.push('/home');
    } else {
      showErrorDialog(response.message);
    }
  }

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

      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <div>
              <Field className='w-[300px] rounded-[8px] p-[10px] bg-white text-black' name="email" type="email" />
              <ErrorMessage className='text-red-500 text-left text-sm' name="email" component="div" />
            </div>
            <div className='h-[10px]' />
            <div>
              <Field className='w-[300px] rounded-[8px] p-[10px] bg-white text-black' name="password" type={showPassword ? 'text' : 'password'} />
              {/* <button type="button" onClick={handleTogglePasswordVisibility} className='absolute right-0 top-0'>
                {showPassword ? 'Hide' : 'Show'}
              </button> */}
              <ErrorMessage className='text-red-500 text-left text-sm' name="password" component="div" />
            </div>
            <div className='h-[10px]' />
            <button type="submit" className='bg-white text-black py-[10px] w-[300px] rounded-[8px]' disabled={isSubmitting}>
              Login
            </button>
          </Form>
        )}
      </Formik>
    </div>
  )
}
