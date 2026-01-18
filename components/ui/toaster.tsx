"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

export type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

export function toast(input: ToastInput) {
  const title = input.title || "";
  const description = input.description;
  const duration = input.duration;

  if (input.variant === "destructive") {
    return sonnerToast.error(title, { description, duration });
  }
  return sonnerToast(title, { description, duration });
}

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      position="top-right"
      closeButton
      toastOptions={{
        style: {
          background: "#0b0b0f",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "white",
        },
      }}
    />
  );
}
