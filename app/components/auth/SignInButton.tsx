"use client"
import { signIn } from "next-auth/react"
import { ArrowRightEndOnRectangleIcon } from "@heroicons/react/16/solid"

export function SignIn() {
  return <button className="btn btn-primary" onClick={() => signIn()}>
    <ArrowRightEndOnRectangleIcon className="size-5" aria-hidden="true" />
    Sign In</button>
}