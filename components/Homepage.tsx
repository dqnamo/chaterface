'use client';

import React, { useState, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Logo from './logo';
import { Lora, UnifrakturCook } from "next/font/google";
import Image from 'next/image';
import { ChatTeardropDots, GithubLogo, Keyboard } from '@phosphor-icons/react';
import Button from './button';
import { motion, useInView } from 'motion/react';

interface HomepageProps {
  db: any; // Use any type for db
  googleClientId: string;
  googleClientName: string;
}

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const unifraktur = UnifrakturCook({
  subsets: ["latin"],
  weight: ["700"],
});

const FeaturePoint = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 }); // Only trigger once, when 30% visible

  const variants = {
    hidden: { opacity: 0.6, y: 20 }, // Start slightly dimmed and down
    visible: { opacity: 1, y: 0 },    // Fade in and move up
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{ duration: 0.5 }}
      className='flex flex-col'
    >
      {children}
    </motion.div>
  );
};

export function Homepage({ db, googleClientId, googleClientName }: HomepageProps) {
  const isBrowser = typeof window !== 'undefined';
  const [nonce] = useState(() => (isBrowser ? crypto.randomUUID() : ''));
  const canRenderGoogle = Boolean(isBrowser && googleClientId);

  return (
    <div className='flex flex-col w-full p-2 h-full dark bg-sage-1'>
      <div className="w-full">
        <div className="flex flex-row items-center w-full max-w-7xl mx-auto pt-8 pb-4 justify-between">
          <div className="flex flex-row gap-4">
            <Logo color="white"/>
          </div>
        </div>
      </div>
      <div className='flex flex-col w-full max-w-7xl py-40 pt-20 px-4 mx-auto gap-2 font-mono'>
        <div className='flex flex-col mb-20'>
          <h1 className={`${lora.className} text-5xl font-medium bg-clip-text text-transparent bg-gradient-to-b pb-2 from-sage-12 to-sage-11 relative z-10`}>Your Interface to Intelligence</h1>
          
          <div className='flex flex-row gap-4 mt-4 items-center'>
            <Button size="small" href="https://github.com/hyperaide/chaterface" target="_blank" className="w-max bg-sage-4 hover:bg-sage-5 text-sage-12 border border-sage-6" icon={<GithubLogo size={14} weight="bold" />}>View on GitHub</Button>
            {canRenderGoogle ? (
              <div className='w-max'>
                  <GoogleOAuthProvider clientId={googleClientId}>
                    <GoogleLogin
                      theme='filled_black'
                      logo_alignment='center'
                      nonce={nonce}
                      onError={() => {
                        console.error('Google Login Failed');
                        alert('Login failed. Please try again.');
                      }}
                      onSuccess={async ({ credential }) => {
                        if (!credential) {
                          console.error('Google Login Failed: No credential received');
                          alert('Login failed: No credential received.');
                          return;
                        }
                        try {
                          await db.auth.signInWithIdToken({
                            clientName: googleClientName || '',
                            idToken: credential,
                            nonce,
                          });
                          // Login successful, AuthProvider will re-render with the user
                        } catch (err: any) {
                          console.error('InstantDB Sign In Failed:', err);
                          alert('Uh oh: ' + (err.body?.message || err.message || 'An unknown error occurred during sign in.'));
                        }
                      }}
                    />
                  </GoogleOAuthProvider>
                </div>
            ) : null}
              <button
                onClick={() => {
                  db.auth
                    .signInAsGuest()
                    .catch((err: any) => {
                      console.error('InstantDB Guest Sign In Failed:', err);
                      alert('Uh oh: ' + (err.body?.message || err.message || 'Unable to sign in as guest.'));
                    });
                }}
                className="flex items-center justify-center rounded-md border border-sage-6 bg-sage-3 px-3 py-2 text-xs font-semibold text-sage-12 transition-colors duration-300 hover:bg-sage-4"
              >
                Try before signing up
              </button>
          </div>
        </div>

        <div className='flex flex-col'>
          <h1 className={`text-xl font-medium text-sage-11`}>1. One unified interface for many AI models </h1>
        </div>

        <div className='flex flex-col'>
          <h1 className={`text-xl font-medium text-sage-11`}>2. Supports models from OpenAI, Anthropic, and Google </h1>
        </div>

        <div className='flex flex-col'>
          <h1 className={`text-xl font-medium text-sage-11`}>3. $10 a month</h1>
        </div>

        <div className='flex flex-col'>
          <h1 className={`text-xl font-medium text-sage-11`}>4. Free forever if you host it yourself</h1>
        </div>

        <div className='flex flex-col'>
          <h1 className={`text-xl font-medium text-sage-11`}>5. Fully open source. Built with Next.js and InstantDB</h1>
        </div>

        <div className='flex flex-col mt-20'>
          <h1 className={`text-xl font-medium text-sage-11`}>6. Keyboard shortcuts to do things faster</h1>
        </div>

        <div className='flex flex-col'>
          <h1 className={`text-xl font-medium text-sage-11`}>7. Use your voice instead of typing</h1>
        </div>
      </div>
    </div>
  );
}

export default Homepage;
