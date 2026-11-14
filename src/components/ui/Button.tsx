/**
 * Pixel-style button, the one every screen uses (MASTER.md task A3-03).
 *
 * Owner: Agent 3 (Explorer). Styles live in `src/app/globals.css` (`.btn`, `.btn-quiet`,
 * `.btn-small`), so a restyle never touches a screen.
 */
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** `primary` is the gold call to action. `quiet` is paper-coloured, for secondary choices. */
export type ButtonVariant = 'primary' | 'quiet';

/** Props shared by the button and the link form. */
interface ButtonBaseProps {
  /** Look of the button. Defaults to `primary`. */
  variant?: ButtonVariant;
  /** `small` is for inline actions such as "Try again". Defaults to `normal`. */
  size?: 'normal' | 'small';
  children: ReactNode;
}

/** A real `<button>`: any native button attribute works (`onClick`, `disabled`, `type`). */
export type ButtonProps = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { href?: undefined };

/** The link form: a Next.js `<Link>` that looks like a button, for moving between screens. */
export interface ButtonLinkProps extends ButtonBaseProps {
  /** Route to go to, for example `/dex`. */
  href: string;
}

/**
 * Build the class list for a button.
 *
 * @param variant - The button's variant.
 * @param size - The button's size.
 * @returns A space-separated class string.
 */
function buttonClass(variant: ButtonVariant, size: 'normal' | 'small'): string {
  return ['btn', variant === 'quiet' ? 'btn-quiet' : '', size === 'small' ? 'btn-small' : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * A pixel-style button, or a link that looks like one when `href` is given.
 *
 * Buttons default to `type="button"` so one inside a form never submits it by accident.
 *
 * @param props - See ButtonProps and ButtonLinkProps.
 * @returns The element.
 */
export function Button(props: ButtonProps | ButtonLinkProps) {
  const { variant = 'primary', size = 'normal', children } = props;
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={buttonClass(variant, size)}>
        {children}
      </Link>
    );
  }
  // Split off the shared styling props, so only native button attributes reach the DOM element.
  const { variant: _variant, size: _size, children: _children, href: _href, ...native } = props;
  return (
    <button type="button" {...native} className={buttonClass(variant, size)}>
      {children}
    </button>
  );
}
