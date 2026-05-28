export default function Section({
  ...props
}: { children: React.ReactNode } & React.ComponentProps<"div">) {
  return (
    <div className="flex flex-col" {...props}>
      <div className="mx-auto flex w-full flex-col border-x border-grayscale-3 p-4 dark:border-grayscale-2 md:p-8 lg:p-16">
        {props.children}
      </div>
    </div>
  );
}
