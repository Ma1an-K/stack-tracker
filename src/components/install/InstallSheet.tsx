import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { isPhoneContext } from '@/lib/installContext';
import { APP_ICON } from './InstallGuide';
import { GetTheApp } from './GetTheApp';

interface InstallSheetProps {
  open: boolean;
  /** "Not now", or the sheet closed any other way. */
  onClose: () => void;
}

/** The second ask: a bottom sheet right after a first win, on phones that haven't installed yet. */
export function InstallSheet({ open, onClose }: InstallSheetProps) {
  const { context } = useInstallPrompt();
  if (!isPhoneContext(context)) return null;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-[22px] bg-card px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center gap-3.5 pr-8">
            <img src={APP_ICON} alt="" className="h-[52px] w-[52px] rounded-xl" />
            <SheetTitle className="font-display text-[1.375rem] font-medium leading-tight">
              Keep it one tap away
            </SheetTitle>
          </div>
          <SheetDescription className="mb-4 text-sm text-muted-foreground">
            Add Stack Tracker to your Home Screen. It opens full screen, loads faster and keeps you signed in.
          </SheetDescription>
          <GetTheApp variant="sheet" />
          <Button variant="link" className="mt-1 min-h-11 w-full text-muted-foreground" onClick={onClose}>
            Not now
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
