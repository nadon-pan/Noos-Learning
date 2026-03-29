'use client';

import React from 'react';
import { motion } from 'framer-motion';

type GradientDotsProps = React.ComponentProps<typeof motion.div> & {
	/** Dot size (default: 8) */
	dotSize?: number;
	/** Spacing between dots (default: 10) */
	spacing?: number;
	/** Animation duration (default: 30) */
	duration?: number;
	/** Background color (default: '#0F1117') */
	backgroundColor?: string;
};

export function GradientDots({
	dotSize = 8,
	spacing = 10,
	duration = 30,
	backgroundColor = '#0F1117',
	className,
	...props
}: GradientDotsProps) {
	const hexSpacing = spacing * 1.732;

	return (
		<motion.div
			className={`absolute inset-0 pointer-events-none opacity-40 ${className ?? ''}`}
			style={{
				backgroundColor,
				backgroundImage: `
          radial-gradient(circle at 50% 50%, transparent 1.5px, ${backgroundColor} 0 ${dotSize}px, transparent ${dotSize}px),
          radial-gradient(circle at 50% 50%, transparent 1.5px, ${backgroundColor} 0 ${dotSize}px, transparent ${dotSize}px),
          radial-gradient(circle at 50% 50%, #157FEC, transparent 60%),
          radial-gradient(circle at 50% 50%, #5E78A3, transparent 60%),
          radial-gradient(circle at 50% 50%, #22263A, transparent 60%),
          radial-gradient(ellipse at 50% 50%, #0F1117, transparent 60%)
        `,
				backgroundSize: `
          ${spacing}px ${hexSpacing}px,
          ${spacing}px ${hexSpacing}px,
          200% 200%,
          200% 200%,
          200% 200%,
          200% ${hexSpacing}px
        `,
				backgroundPosition: `
          0px 0px, ${spacing / 2}px ${hexSpacing / 2}px,
          0% 0%,
          0% 0%,
          0% 0%,
          0% 0px
        `,
			}}
			animate={{
				backgroundPosition: [
					`0px 0px, ${spacing / 2}px ${hexSpacing / 2}px, 800% 400%, 1000% -400%, -1200% -600%, 400% ${hexSpacing}px`,
					`0px 0px, ${spacing / 2}px ${hexSpacing / 2}px, 0% 0%, 0% 0%, 0% 0%, 0% 0%`,
				],
			}}
			transition={{
				backgroundPosition: {
					duration: duration,
					ease: 'linear',
					repeat: Number.POSITIVE_INFINITY,
				},
			}}
			{...props}
		/>
	);
}
