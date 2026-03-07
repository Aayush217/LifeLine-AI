"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeartPulse } from "lucide-react";

export default function RootRedirect() {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role === 'admin') router.push('/admin');
    if (role === 'donor') router.push('/donor');
    if (role === 'hospital') router.push('/hospital');
  }, [role, router]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <HeartPulse className="h-16 w-16 text-red-600 animate-pulse mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Authenticating...</h2>
      </div>
    </div>
  );
}
