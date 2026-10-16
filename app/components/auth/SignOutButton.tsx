"use client"
import { signOut } from "next-auth/react"
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/16/solid"

export function SignOut() {
  return <button className="btn btn-primary" onClick={async () => {
    await signOut({ redirect: false });
    const signOutUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=" + encodeURIComponent(window.location.origin + "/")
    window.location.href =
      signOutUrl;
  }}>
    <ArrowRightStartOnRectangleIcon className="size-5" aria-hidden="true" />
    Sign Out</button>
}