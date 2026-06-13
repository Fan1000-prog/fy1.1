"use client";

import { useRef } from "react";
import Image, { type ImageProps } from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** next/image with a bottom-up clip-path wipe when it enters the viewport. */
export function ImageReveal({
  className,
  wrapperClassName,
  ...props
}: ImageProps & { wrapperClassName?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { clipPath: "inset(100% 0 0 0)" }}
      animate={inView || reduce ? { clipPath: "inset(0% 0 0 0)" } : undefined}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative overflow-hidden", wrapperClassName)}
    >
      <Image className={className} {...props} />
    </motion.div>
  );
}
