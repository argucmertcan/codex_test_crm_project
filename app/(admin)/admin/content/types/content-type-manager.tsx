"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  contentFieldRelationSchema,
  contentFieldSchema,
  contentFieldTypeSchema,
  contentTypeCreateSchema
} from "@/lib/validations/content-type";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiErrorBody {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
}

type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

type ContentFieldInput = z.infer<typeof contentFieldSchema>;
type ContentFieldType = z.infer<typeof contentFieldTypeSchema>;
type RelationConfig = z.infer<typeof contentFieldRelationSchema>;
type ContentTypeFormValues = z.infer<typeof contentTypeCreateSchema>;

interface ContentTypeRecord {
  id: string;
  siteId: string;
  name: string;
  apiId: string;
  description?: string | null;
  fields: ContentFieldInput[];
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedContentTypes {
  items: ContentTypeRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

const parseResponse = async <T,>(response: Response): Promise<T> => {
  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch (error) {
    if (response.ok) {
      throw new Error("Unexpected response shape");
    }
  }

  if (!payload || payload.ok !== true) {
    const message = payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
};

const fetchContentTypes = async (siteId: string, search?: string) => {
  const params = new URLSearchParams({ siteId, limit: "50" });
  if (search?.trim()) {
    params.set("q", search.trim());
  }
  const response = await fetch(`/api/content-types?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store"
  });
  return parseResponse<PaginatedContentTypes>(response);
};

const sanitizeField = (field: ContentFieldInput): ContentFieldInput => {
  const base: ContentFieldInput = {
    key: field.key.trim(),
    label: field.label.trim(),
    type: field.type,
    required: Boolean(field.required)
  };

  if (field.type === "select" || field.type === "multiselect") {
    base.options = (field.options ?? [])
      .map((option) => option.trim())
      .filter((option) => option.length > 0);
  }

  if (field.type === "relation" && field.relation) {
    base.relation = {
      to: field.relation.to,
      multiple: Boolean(field.relation.multiple)
    };
  }

  return base;
};

const defaultRelation: RelationConfig = { to: "entry", multiple: false };

interface ContentTypeManagerProps {
  site: {
    id: string;
    name: string;
    slug?: string;
  };
}

export const ContentTypeManager: React.FC<ContentTypeManagerProps> = ({ site }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [formError, setFormError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<string | null>(null);

  const form = useForm<ContentTypeFormValues>({
    resolver: zodResolver(contentTypeCreateSchema),
    defaultValues: {
      siteId: site.id,
      name: "",
      apiId: "",
      description: "",
      fields: []
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "fields"
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["content-types", site.id, deferredSearch],
    queryFn: () => fetchContentTypes(site.id, deferredSearch),
    enabled: Boolean(site.id)
  });

  const contentTypes = data?.items ?? [];

  const selectedType = useMemo(() => {
    if (selectedId === "new") {
      return null;
    }
    return contentTypes.find((item) => item.id === selectedId) ?? null;
  }, [contentTypes, selectedId]);

  useEffect(() => {
    setSearch("");
    setSelectedId("new");
    setFormError(null);
    setFormStatus(null);
    form.reset({ siteId: site.id, name: "", apiId: "", description: "", fields: [] });
  }, [site.id, form]);

  useEffect(() => {
    if (!selectedType) {
      form.reset({ siteId: site.id, name: "", apiId: "", description: "", fields: [] });
      replace([]);
      return;
    }

    form.reset({
      siteId: site.id,
      name: selectedType.name,
      apiId: selectedType.apiId,
      description: selectedType.description ?? "",
      fields: selectedType.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
        options: field.options ?? [],
        relation: field.relation ? { to: field.relation.to, multiple: Boolean(field.relation.multiple) } : undefined
      }))
    });
    replace(
      selectedType.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
        options: field.options ?? [],
        relation: field.relation ? { to: field.relation.to, multiple: Boolean(field.relation.multiple) } : undefined
      }))
    );
  }, [form, replace, selectedType, site.id]);

  useEffect(() => {
    if (selectedId !== "new" && selectedType == null && contentTypes.length) {
      setSelectedId(contentTypes[0].id);
    }
  }, [contentTypes, selectedId, selectedType]);

  const createMutation = useMutation({
    mutationFn: async (values: ContentTypeFormValues) => {
      const response = await fetch("/api/content-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          siteId: site.id,
          name: values.name.trim(),
          apiId: slugify(values.apiId),
          description: values.description?.trim() ? values.description.trim() : null,
          fields: values.fields.map(sanitizeField)
        })
      });
      return parseResponse<ContentTypeRecord>(response);
    },
    onSuccess: (created) => {
      setFormStatus("Content type created");
      setSelectedId(created.id);
      queryClient.invalidateQueries({ queryKey: ["content-types", site.id] });
    },
    onError: (error: Error) => {
      setFormError(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ContentTypeFormValues }) => {
      const response = await fetch("/api/content-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: values.name.trim(),
          description: values.description?.trim() ? values.description.trim() : null,
          fields: values.fields.map(sanitizeField)
        })
      });
      return parseResponse<ContentTypeRecord>(response);
    },
    onSuccess: (updated) => {
      setFormStatus("Content type updated");
      setSelectedId(updated.id);
      queryClient.invalidateQueries({ queryKey: ["content-types", site.id] });
    },
    onError: (error: Error) => {
      setFormError(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch("/api/content-types", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      return parseResponse<{ id: string }>(response);
    },
    onSuccess: () => {
      setFormStatus("Content type deleted");
      setSelectedId("new");
      form.reset({ siteId: site.id, name: "", apiId: "", description: "", fields: [] });
      queryClient.invalidateQueries({ queryKey: ["content-types", site.id] });
    },
    onError: (error: Error) => {
      setFormError(error.message);
    }
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setFormStatus(null);
    if (selectedType) {
      await updateMutation.mutateAsync({ id: selectedType.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  });

  const handleDelete = async () => {
    if (!selectedType) {
      return;
    }
    const confirmed = window.confirm(
      `Delete \"${selectedType.name}\"? Entries associated with this content type will no longer be editable.`
    );
    if (!confirmed) {
      return;
    }
    setFormError(null);
    setFormStatus(null);
    await deleteMutation.mutateAsync(selectedType.id);
  };

  const handleAddField = () => {
    append({ key: "", label: "", type: "text", required: false, options: [] });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Content models</CardTitle>
          <CardDescription>Manage structured content for {site.name}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search content types"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedId("new");
                setFormError(null);
                setFormStatus(null);
              }}
            >
              New
            </Button>
          </div>
          <Separator />
          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Loading content types…</div>
          ) : error ? (
            <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <p>Unable to load content types.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["content-types", site.id] })}
                className="text-destructive"
              >
                Retry
              </Button>
            </div>
          ) : contentTypes.length === 0 ? (
            <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              No content types yet. Create your first model to start structuring content.
            </div>
          ) : (
            <div className="space-y-2">
              {contentTypes.map((contentType) => {
                const isActive = selectedId === contentType.id;
                return (
                  <button
                    key={contentType.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(contentType.id);
                      setFormError(null);
                      setFormStatus(null);
                    }}
                    className={cn(
                      "w-full rounded-md border px-3 py-3 text-left transition",
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-card hover:border-primary/60 hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{contentType.name}</p>
                          <Badge variant="outline">{contentType.apiId}</Badge>
                        </div>
                        {contentType.description ? (
                          <p className="text-xs text-muted-foreground">{contentType.description}</p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">{contentType.fields.length} fields</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {isFetching && !isLoading ? (
            <p className="text-xs text-muted-foreground">Refreshing…</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{selectedType ? `Edit ${selectedType.name}` : "Create content type"}</CardTitle>
          <CardDescription>
            {selectedType
              ? "Update fields and metadata. Changes apply to new and existing entries."
              : "Define the structure editors will use when creating new content."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Article" disabled={isSaving} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API identifier</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="article"
                          disabled={isSaving || Boolean(selectedType)}
                          onBlur={(event) => field.onChange(slugify(event.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Used in API responses and references. Lowercase kebab-case.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe how this content type should be used"
                        disabled={isSaving}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>Optional description to help collaborators understand this model.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Fields</h3>
                    <p className="text-xs text-muted-foreground">
                      Add and configure fields that editors will fill when creating entries.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddField} disabled={isSaving}>
                    <Plus className="h-4 w-4" />
                    Add field
                  </Button>
                </div>
                {fields.length === 0 ? (
                  <div className="rounded-md border border-dashed border-muted-foreground/50 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                    No fields yet. Start by adding a title or rich text block.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((fieldItem, index) => {
                      const fieldType = form.watch(`fields.${index}.type`);
                      return (
                        <div key={fieldItem.id} className="space-y-4 rounded-lg border border-border bg-card/40 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="grid flex-1 gap-3 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`fields.${index}.label`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Label</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Title" disabled={isSaving} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`fields.${index}.key`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Key</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="title"
                                        disabled={isSaving}
                                        onBlur={(event) => field.onChange(slugify(event.target.value))}
                                      />
                                    </FormControl>
                                    <FormDescription>Used in stored JSON. Lowercase kebab-case.</FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`fields.${index}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Field type</FormLabel>
                                    <FormControl>
                                      <select
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={field.value}
                                        disabled={isSaving}
                                        onChange={(event) => {
                                          const value = event.target.value as ContentFieldType;
                                          field.onChange(value);
                                          if (value === "relation") {
                                            const currentRelation = form.getValues(`fields.${index}.relation`);
                                            if (!currentRelation) {
                                              form.setValue(`fields.${index}.relation`, { ...defaultRelation }, {
                                                shouldDirty: true,
                                                shouldValidate: true
                                              });
                                            }
                                          } else {
                                            form.setValue(`fields.${index}.relation`, undefined, {
                                              shouldDirty: true,
                                              shouldValidate: true
                                            });
                                          }
                                          if (value !== "select" && value !== "multiselect") {
                                            form.setValue(`fields.${index}.options`, [], {
                                              shouldDirty: true,
                                              shouldValidate: true
                                            });
                                          }
                                        }}
                                      >
                                        {contentFieldTypeSchema.options.map((option) => (
                                          <option key={option} value={option}>
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                          </option>
                                        ))}
                                      </select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`fields.${index}.required`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value ?? false}
                                        onChange={(event) => field.onChange(event.target.checked)}
                                        disabled={isSaving}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">Required</FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              disabled={isSaving}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {fieldType === "select" || fieldType === "multiselect" ? (
                            <FormField
                              control={form.control}
                              name={`fields.${index}.options`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Options</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      value={(field.value ?? []).join("\n")}
                                      onChange={(event) =>
                                        field.onChange(
                                          event.target.value
                                            .split("\n")
                                            .map((option) => option.trim())
                                        )
                                      }
                                      placeholder="Add one option per line"
                                      disabled={isSaving}
                                      rows={4}
                                    />
                                  </FormControl>
                                  <FormDescription>Displayed to editors when choosing a value.</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}
                          {fieldType === "relation" ? (
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`fields.${index}.relation.to`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Relates to</FormLabel>
                                    <FormControl>
                                      <select
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={field.value ?? defaultRelation.to}
                                        onChange={(event) =>
                                          field.onChange(event.target.value as RelationConfig["to"])
                                        }
                                        disabled={isSaving}
                                      >
                                        <option value="entry">Entries</option>
                                        <option value="media">Media</option>
                                        <option value="taxonomy">Taxonomy</option>
                                      </select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`fields.${index}.relation.multiple`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value ?? false}
                                        onChange={(event) => field.onChange(event.target.checked)}
                                        disabled={isSaving}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">Allow multiple selections</FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {formError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              {formStatus ? (
                <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  {formStatus}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {selectedType ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={isSaving || isDeleting}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete content type
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Site: {site.name}</span>
                )}
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {selectedType ? "Save changes" : "Create content type"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
