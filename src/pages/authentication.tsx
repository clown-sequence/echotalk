import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Signup } from "../components/signup";
import { Signin } from "../components/signin";
import { LogIn, UserPlus, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from '../contexts/auth-contexts'
import { Navigate } from "react-router-dom";

export function Authentication() {
  const [isSignIn, setIsSignIn] = useState(true);
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const, // Use const assertion
        stiffness: 100,
        damping: 15
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  const toggleVariants = {
    left: { x: 0 },
    right: { x: "100%" }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { delay: 0.2 }
    }
  };
  const { user } = useAuth()
  if (user) return <Navigate to={'chat-hub'} />
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex items-center justify-center p-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        {/* Animated background decoration */}
        <motion.div
          className="absolute top-10 left-10 opacity-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={120} className="text-blue-500" />
        </motion.div>
        
        <motion.div
          className="absolute bottom-10 right-10 opacity-10"
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={100} className="text-purple-500" />
        </motion.div>

        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          variants={textVariants}
        >
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Welcome Back
          </motion.h1>
          <p className="text-gray-600 dark:text-gray-300">
            {isSignIn ? "Sign in to continue" : "Create your account"}
          </p>
        </motion.div>

        {/* Toggle Container */}
        <motion.div 
          className="relative bg-white dark:bg-gray-800 rounded-2xl p-1 mb-6 shadow-lg border border-gray-200 dark:border-gray-700"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex relative">
            {/* Background Slider */}
            <motion.div
              className="absolute top-1 left-1 w-1/2 h-[calc(100%-0.5rem)] bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl"
              variants={toggleVariants}
              animate={isSignIn ? "right" : "left"}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
            
            {/* Sign Up Button */}
            <button
              onClick={() => setIsSignIn(false)}
              className={`flex-1 py-3 px-4 rounded-xl relative z-10 transition-colors duration-300 ${
                !isSignIn 
                  ? "text-white" 
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center justify-center gap-2 font-semibold">
                <UserPlus className="w-5 h-5" />
                Sign Up
              </div>
            </button>
            
            {/* Sign In Button */}
            <button
              onClick={() => setIsSignIn(true)}
              className={`flex-1 py-3 px-4 rounded-xl relative z-10 transition-colors duration-300 ${
                isSignIn 
                  ? "text-white" 
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center justify-center gap-2 font-semibold">
                <LogIn className="w-5 h-5" />
                Sign In
              </div>
            </button>
          </div>
        </motion.div>

        {/* Animated form content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isSignIn ? "signin" : "signup"}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Form Header */}
            <motion.div 
              className="p-6 border-b border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30"
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  {isSignIn ? (
                    <LogIn className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <UserPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  )}
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {isSignIn ? "Welcome Back" : "Join Us Today"}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isSignIn 
                      ? "Enter your credentials to access your account" 
                      : "Fill in your details to create an account"
                    }
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Form Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSignIn ? "signin-form" : "signup-form"}
                  initial={{ opacity: 0, x: isSignIn ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isSignIn ? -20 : 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {isSignIn ? <Signin /> : <Signup />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Form Footer */}
            <motion.div 
              className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isSignIn ? "Don't have an account?" : "Already have an account?"}
                  <button
                    onClick={() => setIsSignIn(!isSignIn)}
                    className="ml-2 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 group"
                  >
                    {isSignIn ? "Sign up" : "Sign in"}
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="inline-block"
                    >
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.span>
                  </button>
                </p>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Extra Info */}
        <motion.div 
          className="text-center mt-6"
          variants={textVariants}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            By continuing, you agree to our{" "}
            <button className="text-blue-600 dark:text-blue-400 hover:underline">
              Terms
            </button>{" "}
            and{" "}
            <button className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}