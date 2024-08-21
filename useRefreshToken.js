"use client";

import { axiosRefresh } from "../axios";
import { useSession, signOut } from "next-auth/react";

export const useRefreshToken = () => {
  const { data: session, update } = useSession();

  const refreshToken = async () => {
    try {
      const response = await axiosRefresh.post("/auth/refresh", {
        refreshToken: session?.user?.refreshToken,
      });

      await update({
        user: {
          accessToken: response?.data?.accessToken,
          refreshToken: response?.data?.refreshToken,
        },
      });

      return response?.data?.accessToken;
    } catch (error) {
      console.log("Refresh token error:", error);
      // signOut();
      return null;
    }
  };

  return refreshToken;
};
