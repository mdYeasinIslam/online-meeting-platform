import { useEffect } from 'react';
import { RefObject } from 'react';

interface ClickOutsideEvent extends MouseEvent {
  target: EventTarget | null;
}

export const useClickOutside = (
  ref: RefObject<HTMLElement>,
  callback: (event: ClickOutsideEvent) => void
): void => {
  useEffect(() => {
    const listener = (event: ClickOutsideEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }

      callback(event);
    };

    document.addEventListener('mousedown', listener as EventListener);
    document.addEventListener('touchstart', listener as EventListener);

    return () => {
      document.removeEventListener('mousedown', listener as EventListener);
      document.removeEventListener('touchstart', listener as EventListener);
    };
  }, [ref, callback]);
};
