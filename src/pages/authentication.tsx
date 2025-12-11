import { useState } from "react";
import { Signup } from "../components/signup";
import { Signin } from "../components/signin";
// import { useAuth } from "../contexts/auth-contexts";
import { Button } from "../components/ui/button";

export function Authentication() {
  // const { user } = useAuth();
  const [isSignIn, setIsSignIn] = useState(false);
  return (
    <div>
      <div className="">
        <Button onClick={() => setIsSignIn(!isSignIn)}>
          Switch
        </Button>
      </div>
      {isSignIn ? (
        <div className="">
          <Signin />
        </div>
      ) : (
        <div className="">
          <Signup />
        </div>
      )}
    </div>
  )
}
