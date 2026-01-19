import { toast } from "sonner";

/**
 * Lightweight compatibility hook.
 * This app uses `sonner` for toasts; provide a `useToast()` API so
 * components can call `toast.*` without depending on a missing shadcn hook.
 */
export function useToast() {
  return { toast };
}

export { toast };
