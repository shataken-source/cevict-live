import React, { useEffect, useState } from 'react';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogTriggerProps {
  children: React.ReactNode;
  onClick?: () => void;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {}
});

const Dialog: React.FC<DialogProps> = ({ open = false, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = useState(open);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, onClick }) => {
  const { setOpen } = React.useContext(DialogContext);

  const handleClick = () => {
    setOpen(true);
    onClick?.();
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  );
};

const DialogContent: React.FC<DialogContentProps> = ({ children, className = '' }) => {
  const { open, setOpen } = React.useContext(DialogContext);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className={`relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 ${className}`}>
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
  return (
    <div className="mb-4">
      {children}
    </div>
  );
};

const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = '' }) => {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h2>
  );
};

const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className = '' }) => {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`}>
      {children}
    </p>
  );
};

const DialogFooter: React.FC<DialogFooterProps> = ({ children }) => {
  return (
    <div className="mt-6 flex justify-end space-x-2">
      {children}
    </div>
  );
};

export {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader,
    DialogTitle, DialogTrigger
};

