"use client";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Activity } from 'lucide-react';

export function Appbar(){
    return(
        <div className='flex justify-between items-center p-4'>
            <div className="flex items-center space-x-2">
                        <Activity className="w-8 h-8 text-[#8B7355]" />
                        <span className="text-xl font-bold">Validate-me</span>
                      </div>
            <div>
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            </div>
        </div>
        )

}