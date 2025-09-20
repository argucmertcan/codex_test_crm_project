import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext
} from "react-hook-form";

import { cn } from "@/lib/utils";

const FormFieldContext = React.createContext<{ name: string } | undefined>(undefined);
const FormItemContext = React.createContext<{ id: string } | undefined>(undefined);

export const Form = FormProvider;

export const FormField = <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>(
  props: ControllerProps<TFieldValues, TName>
) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name as string }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn("space-y-2", className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = "FormItem";

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const form = useFormContext();

  const fieldState = fieldContext?.name
    ? form.getFieldState(fieldContext.name, form.formState)
    : undefined;

  const id = itemContext?.id;

  return {
    id,
    name: fieldContext?.name,
    formItemId: id,
    formDescriptionId: id ? `${id}-description` : undefined,
    formMessageId: id ? `${id}-message` : undefined,
    error: fieldState?.error
  };
};

export const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        error ? "text-destructive" : null,
        className
      )}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

export const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ className, ...props }, ref) => {
  const { formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot
      ref={ref}
      className={className}
      id={formItemId}
      aria-describedby={formDescriptionId}
      aria-errormessage={formMessageId}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();
  return (
    <p ref={ref} id={formDescriptionId} className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
});
FormDescription.displayName = "FormDescription";

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "Invalid value") : children;
  if (!body) {
    return null;
  }
  return (
    <p ref={ref} id={formMessageId} className={cn("text-sm font-medium text-destructive", className)} {...props}>
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";
