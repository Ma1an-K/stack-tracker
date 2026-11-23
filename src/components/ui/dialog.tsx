import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Swipe-down-to-dismiss for the mobile bottom sheet, driven from the grabber
 * strip at the top. The sheet follows the finger after an 8 px threshold, and
 * closes past 96 px (or a quick flick); otherwise it springs back. The Close
 * button stays the primary, non-gesture way out.
 */
function useSheetDrag(closeRef: React.RefObject<HTMLButtonElement>) {
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef<{ y: number; t: number; dy: number; active: boolean } | null>(null);

  const setOffset = (dy: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    el.style.transform = dy ? `translateY(${dy}px)` : "";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0, active: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = Math.max(0, e.clientY - d.y);
    if (!d.active && dy < 8) return;
    d.active = true;
    d.dy = dy;
    setOffset(dy, false);
  };
  const end = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.active) return;
    const velocity = d.dy / Math.max(1, e.timeStamp - d.t);
    if (d.dy > 96 || velocity > 0.6) {
      setOffset(0, false);
      closeRef.current?.click();
    } else {
      setOffset(0, true);
    }
  };

  return { sheetRef, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end } };
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const { sheetRef, handlers } = useSheetDrag(closeRef);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      sheetRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref, sheetRef],
  );
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={setRefs}
      className={cn(
        "fixed z-50 grid w-full gap-4 border border-border bg-popover text-popover-foreground shadow-[0_-20px_60px_-20px_hsl(0_0%_0%/0.9)] inset-x-0 bottom-[var(--kb-inset,0px)] max-h-[calc(92dvh-var(--kb-inset,0px))] overflow-y-auto overscroll-contain rounded-t-[1.5rem] border-b-0 px-5 pt-7 pb-[calc(1.25rem+env(safe-area-inset-bottom))] data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-h-[88dvh] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border-b sm:p-6 sm:data-[state=open]:animate-in sm:data-[state=closed]:animate-out sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:duration-200",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="absolute inset-x-14 top-0 h-7 touch-none sm:hidden" {...handlers}>
        <span className="pointer-events-none absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/30" />
      </div>
      {children}
      <DialogPrimitive.Close ref={closeRef} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none">
        <X className="h-[18px] w-[18px]" aria-hidden="true" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 pr-10 text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-[1.6rem] font-semibold leading-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
