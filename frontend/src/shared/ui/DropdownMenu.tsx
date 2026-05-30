import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {cn} from "@/shared/lib/utils.ts";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

type DropdownMenuContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>;

const DropdownMenuContent = ({className, sideOffset = 4, ref, ...props}: DropdownMenuContentProps & {
    ref?: React.Ref<React.ComponentRef<typeof DropdownMenuPrimitive.Content>>
}) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                'z-50 min-w-[12rem] overflow-hidden rounded-md border border-slate-800 bg-slate-900 p-1 text-slate-200 shadow-xl animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
                className
            )}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

type DropdownMenuItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
};

const DropdownMenuItem = ({className, inset, ref, ...props}: DropdownMenuItemProps & {
    ref?: React.Ref<React.ComponentRef<typeof DropdownMenuPrimitive.Item>>
}) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-slate-800 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            inset && 'pl-8',
            className
        )}
        {...props}
    />
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

type DropdownMenuSeparatorProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>;

const DropdownMenuSeparator = ({className, ref, ...props}: DropdownMenuSeparatorProps & {
    ref?: React.Ref<React.ComponentRef<typeof DropdownMenuPrimitive.Separator>>
}) => (
    <DropdownMenuPrimitive.Separator
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-slate-800', className)}
        {...props}
    />
);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({className, inset, children, ...props}, ref) => (
    <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
            "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-slate-800 data-[state=open]:bg-slate-800",
            inset && "pl-8",
            className
        )}
        {...props}
    >
        {children}
    </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({className, ...props}, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
            ref={ref}
            className={cn(
                "z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-800 bg-slate-900 p-1 text-slate-200 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                className
            )}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
};