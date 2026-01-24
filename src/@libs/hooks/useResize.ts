import { useEffect, useRef, useState } from 'react';

const useResize = <T extends HTMLElement>() => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isWidthResizing, setWidthResizing] = useState(false);
  const [isHeightResizing, setHeightResizing] = useState(false);
  const elemRef = useRef<T>(null);

  const widthTimeoutRef = useRef<NodeJS.Timeout>(null);
  const heightTimeoutRef = useRef<NodeJS.Timeout>(null);
  const prevSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (!elemRef.current) return;

      const newWidth = elemRef.current.offsetWidth;
      const newHeight = elemRef.current.offsetHeight;

      if (newWidth !== prevSizeRef.current.width) {
        setWidthResizing(true);
        if (widthTimeoutRef.current) clearTimeout(widthTimeoutRef.current);
        widthTimeoutRef.current = setTimeout(() => setWidthResizing(false), 300);
      }

      if (newHeight !== prevSizeRef.current.height) {
        setHeightResizing(true);
        if (heightTimeoutRef.current) clearTimeout(heightTimeoutRef.current);
        heightTimeoutRef.current = setTimeout(() => setHeightResizing(false), 300);
      }

      setSize({ width: newWidth, height: newHeight });
      prevSizeRef.current = { width: newWidth, height: newHeight };
    };

    const resizeObserver = new ResizeObserver(updateSize);

    if (elemRef.current) {
      resizeObserver.observe(elemRef.current);
      updateSize();
    }

    return () => {
      resizeObserver.disconnect();
      if (widthTimeoutRef.current) clearTimeout(widthTimeoutRef.current);
      if (heightTimeoutRef.current) clearTimeout(heightTimeoutRef.current);
    };
  }, []);

  return { elemRef, ...size, isWidthResizing, isHeightResizing };
};

export default useResize;
