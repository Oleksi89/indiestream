import * as React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import {ChevronRight} from 'lucide-react';
import {cn} from "@/shared/lib/utils.ts";
import type {
    ContextMenuContentProps,
    ContextMenuSeparatorProps, ContextMenuSubContentProps
} from "@radix-ui/react-context-menu";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuContent = ({className, ref, ...props}: ContextMenuContentProps & {
    ref?: React.Ref<React.ComponentRef<typeof ContextMenuPrimitive.Content>>
}) => (
    <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
            ref={ref}
            className={cn(
                'z-50 min-w-[12rem] overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 p-1 text-neutral-200 shadow-xl animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
                className
            )}
            {...props}
        />
    </ContextMenuPrimitive.Portal>
);
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;


interface ContextMenuItemProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> {
    inset?: boolean;
}

const ContextMenuItem = ({className, inset, ref, ...props}: ContextMenuItemProps & {
    ref?: React.Ref<React.ComponentRef<typeof ContextMenuPrimitive.Item>>
}) => (
    <ContextMenuPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-neutral-800 focus:text-neutral-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            inset && 'pl-8',
            className
        )}
        {...props}
    />
);
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;


const ContextMenuSeparator = ({className, ref, ...props}: ContextMenuSeparatorProps & {
    ref?: React.Ref<React.ComponentRef<typeof ContextMenuPrimitive.Separator>>
}) => (
    <ContextMenuPrimitive.Separator
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-neutral-800', className)}
        {...props}
    />
);
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

interface ContextMenuSubTriggerProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> {
    inset?: boolean;
}

const ContextMenuSubTrigger = ({className, inset, children, ref, ...props}: ContextMenuSubTriggerProps & {
    ref?: React.Ref<React.ComponentRef<typeof ContextMenuPrimitive.SubTrigger>>
}) => (
    <ContextMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
            'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-neutral-800 data-[state=open]:bg-neutral-800 data-[state=open]:text-neutral-50',
            inset && 'pl-8',
            className
        )}
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto h-4 w-4"/>
    </ContextMenuPrimitive.SubTrigger>
);
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;


const ContextMenuSubContent = ({className, ref, ...props}: ContextMenuSubContentProps & {
    ref?: React.Ref<React.ComponentRef<typeof ContextMenuPrimitive.SubContent>>
}) => (
    <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.SubContent
            ref={ref}
            className={cn(
                'z-50 min-w-[12rem] overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 p-1 text-neutral-200 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
                className
            )}
            {...props}
        />
    </ContextMenuPrimitive.Portal>
);
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

export {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
};