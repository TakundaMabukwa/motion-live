import { NextLogo } from "./next-logo";

export function Hero() {
  return (
    <div className="flex flex-col items-center gap-16">
      <div className="flex justify-center items-center gap-8">
        <a href="https://nextjs.org/" target="_blank" rel="noreferrer">
          <NextLogo />
        </a>
      </div>
      <h1 className="sr-only">Got Motion - Vehicle Management System</h1>
      <p className="mx-auto max-w-xl text-3xl lg:text-4xl text-center !leading-tight">
        The complete vehicle management system built with{" "}
        <a
          href="https://nextjs.org/"
          target="_blank"
          className="font-bold hover:underline"
          rel="noreferrer"
        >
          Next.js
        </a>
      </p>
      <div className="bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8 p-[1px] w-full" />
    </div>
  );
}
