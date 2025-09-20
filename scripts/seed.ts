import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import bcrypt from "bcryptjs";

import type { ContentField } from "@/server/db/models/contentType.model";
import type { EntryBlock, EntryStatus } from "@/server/db/models/entry.model";
import type { UserRole, UserStatus } from "@/server/db/models/user.model";

const [{ disconnectFromDatabase }, userRepoModule, siteRepoModule, contentTypeRepoModule, entryRepoModule] = await Promise.all([
  import("@/server/db/connection"),
  import("@/server/db/repositories/user.repository"),
  import("@/server/db/repositories/site.repository"),
  import("@/server/db/repositories/contentType.repository"),
  import("@/server/db/repositories/entry.repository")
]);

const { userRepository } = userRepoModule;
const { siteRepository } = siteRepoModule;
const { contentTypeRepository } = contentTypeRepoModule;
const { entryRepository } = entryRepoModule;

interface SeedUserDefinition {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
  image?: string | null;
  status?: UserStatus;
}

interface SeedSiteDefinition {
  name: string;
  slug: string;
  domain?: string | null;
  locales: string[];
  defaultLocale: string;
  theme: string;
}

interface SeedContentTypeDefinition {
  name: string;
  apiId: string;
  description?: string;
  fields: ContentField[];
}

interface SeedEntryDefinition {
  slug: string;
  title: string;
  status: EntryStatus;
  publishAt?: Date | null;
  locale?: string;
  data?: Record<string, unknown>;
  blocks?: EntryBlock[];
}

const hashPassword = async (password: string): Promise<string> => {
  const rounds = 12;
  return bcrypt.hash(password, rounds);
};

const ensureUser = async (definition: SeedUserDefinition, actorId?: string) => {
  const status: UserStatus = definition.status ?? "active";
  const existing = await userRepository.findByEmail(definition.email, { includeDeleted: true });
  const passwordHash = await hashPassword(definition.password);

  if (existing) {
    if (existing.isDeleted) {
      await userRepository.restore(existing.id, actorId ?? existing.id);
    }

    const updated = await userRepository.update(
      existing.id,
      {
        name: definition.name,
        image: definition.image ?? null,
        roles: definition.roles,
        status,
        passwordHash
      },
      actorId
    );

    console.log(`↺ Updated user ${definition.email}`);
    return updated ?? (await userRepository.findByEmail(definition.email))!;
  }

  const created = await userRepository.create(
    {
      name: definition.name,
      email: definition.email,
      image: definition.image ?? null,
      roles: definition.roles,
      status,
      passwordHash
    },
    actorId
  );

  console.log(`✓ Created user ${definition.email}`);
  return created;
};

const ensureSite = async (definition: SeedSiteDefinition, actorId?: string) => {
  const existing = await siteRepository.findBySlug(definition.slug, { includeDeleted: true });

  if (existing) {
    if (existing.isDeleted) {
      await siteRepository.restore(existing.id, actorId);
    }

    const updated = await siteRepository.update(
      existing.id,
      {
        name: definition.name,
        domain: definition.domain ?? null,
        locales: definition.locales,
        defaultLocale: definition.defaultLocale,
        theme: definition.theme
      },
      actorId
    );

    console.log(`↺ Updated site ${definition.slug}`);
    return updated ?? (await siteRepository.findBySlug(definition.slug))!;
  }

  const created = await siteRepository.create(
    {
      name: definition.name,
      slug: definition.slug,
      domain: definition.domain ?? undefined,
      locales: definition.locales,
      defaultLocale: definition.defaultLocale,
      theme: definition.theme
    },
    actorId
  );

  console.log(`✓ Created site ${definition.slug}`);
  return created;
};

const ensureContentType = async (
  siteId: string,
  definition: SeedContentTypeDefinition,
  actorId: string
) => {
  const existing = await contentTypeRepository.findByApiId(siteId, definition.apiId, { includeDeleted: true });

  if (existing) {
    if (existing.isDeleted) {
      await contentTypeRepository.restore(existing.id, actorId);
    }

    const updated = await contentTypeRepository.update(
      existing.id,
      {
        name: definition.name,
        description: definition.description ?? null,
        fields: definition.fields
      },
      actorId
    );

    console.log(`↺ Updated content type ${definition.apiId}`);
    return updated ?? (await contentTypeRepository.findByApiId(siteId, definition.apiId))!;
  }

  const created = await contentTypeRepository.create(
    {
      siteId,
      name: definition.name,
      apiId: definition.apiId,
      description: definition.description ?? null,
      fields: definition.fields
    },
    actorId
  );

  console.log(`✓ Created content type ${definition.apiId}`);
  return created;
};

const ensureEntry = async (
  siteId: string,
  contentTypeId: string,
  definition: SeedEntryDefinition,
  actorId: string
) => {
  const locale = definition.locale ?? "en";
  const existing = await entryRepository.findBySlug(siteId, definition.slug, locale, { includeDeleted: true });

  if (existing) {
    if (existing.isDeleted) {
      await entryRepository.restore(existing.id, actorId);
    }

    const updated = await entryRepository.update(
      existing.id,
      {
        title: definition.title,
        slug: definition.slug,
        status: definition.status,
        publishAt: definition.publishAt ?? null,
        locale,
        data: definition.data ?? {},
        blocks: definition.blocks ?? [],
        lastEditorId: actorId
      },
      actorId
    );

    console.log(`↺ Updated entry ${definition.slug} [${locale}]`);
    return updated ?? (await entryRepository.findBySlug(siteId, definition.slug, locale))!;
  }

  const created = await entryRepository.create(
    {
      siteId,
      contentTypeId,
      slug: definition.slug,
      title: definition.title,
      status: definition.status,
      publishAt: definition.publishAt ?? null,
      locale,
      data: definition.data ?? {},
      blocks: definition.blocks ?? [],
      authorId: actorId
    },
    actorId
  );

  console.log(`✓ Created entry ${definition.slug} [${locale}]`);
  return created;
};

const seed = async () => {
  console.log("⏳ Seeding database...");

  const admin = await ensureUser({
    name: "Avery Admin",
    email: "admin@nebula.dev",
    password: "admin123!",
    roles: ["admin", "editor"],
    image: "https://avatars.dicebear.com/api/initials/Avery%20Admin.svg"
  });

  const adminId = admin.id;

  await ensureUser(
    {
      name: "Eden Editor",
      email: "editor@nebula.dev",
      password: "editor123!",
      roles: ["editor"],
      image: "https://avatars.dicebear.com/api/initials/Eden%20Editor.svg"
    },
    adminId
  );

  await ensureUser(
    {
      name: "Ari Author",
      email: "author@nebula.dev",
      password: "author123!",
      roles: ["author"],
      image: "https://avatars.dicebear.com/api/initials/Ari%20Author.svg"
    },
    adminId
  );

  const site = await ensureSite(
    {
      name: "Nebula Studio",
      slug: "nebula-studio",
      domain: "nebula.local",
      locales: ["en", "es"],
      defaultLocale: "en",
      theme: "dark"
    },
    adminId
  );

  const pageContentType = await ensureContentType(
    site.id,
    {
      name: "Page",
      apiId: "page",
      description: "Structured marketing or informational page",
      fields: [
        { key: "heroTitle", label: "Hero title", type: "text", required: true },
        { key: "heroSubtitle", label: "Hero subtitle", type: "text" },
        { key: "body", label: "Body", type: "richtext", required: true },
        { key: "ctaLabel", label: "CTA label", type: "text" },
        { key: "ctaUrl", label: "CTA URL", type: "text" },
        { key: "seoDescription", label: "SEO description", type: "markdown" }
      ] satisfies ContentField[]
    },
    adminId
  );

  const postContentType = await ensureContentType(
    site.id,
    {
      name: "Post",
      apiId: "post",
      description: "Editorial blog or changelog entry",
      fields: [
        { key: "excerpt", label: "Excerpt", type: "markdown", required: true },
        { key: "heroImage", label: "Hero image", type: "image" },
        {
          key: "category",
          label: "Category",
          type: "select",
          required: true,
          options: ["Announcements", "Product", "Tutorials"]
        },
        {
          key: "tags",
          label: "Tags",
          type: "multiselect",
          options: ["nextjs", "headless", "release", "guides"]
        },
        { key: "body", label: "Body", type: "richtext", required: true },
        { key: "featured", label: "Featured", type: "boolean" }
      ] satisfies ContentField[]
    },
    adminId
  );

  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3);
  const twoDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2);

  await ensureEntry(
    site.id,
    pageContentType.id,
    {
      slug: "home",
      title: "Welcome to Nebula Studio",
      status: "published",
      publishAt: twoDaysAgo,
      locale: "en",
      data: {
        heroTitle: "Craft stellar digital experiences",
        heroSubtitle: "Nebula Studio helps teams design, author, and ship content faster.",
        body: "<p>Nebula Studio pairs a headless CMS with an editor-friendly experience. Compose sections, collaborate with your team, and publish to any channel.</p>",
        ctaLabel: "Explore the docs",
        ctaUrl: "/docs/overview",
        seoDescription:
          "Nebula Studio is the content platform for teams building ambitious digital products."
      },
      blocks: [
        {
          type: "hero",
          data: {
            eyebrow: "New",
            heading: "The next generation CMS",
            byline: "Composable, multi-tenant, and editor friendly."
          }
        },
        {
          type: "feature-grid",
          data: {
            columns: [
              {
                title: "Structured content",
                description: "Model anything with flexible fields and references."
              },
              {
                title: "Collaborative workflows",
                description: "Draft, review, and schedule updates with confidence."
              },
              {
                title: "Omnichannel delivery",
                description: "Publish once and distribute everywhere with webhooks or SDKs."
              }
            ]
          }
        },
        {
          type: "cta",
          data: {
            label: "Book a demo",
            href: "https://nebula.dev/demo",
            tone: "primary"
          }
        }
      ]
    },
    adminId
  );

  await ensureEntry(
    site.id,
    pageContentType.id,
    {
      slug: "about",
      title: "About Nebula Studio",
      status: "draft",
      publishAt: null,
      locale: "en",
      data: {
        heroTitle: "A team obsessed with editor experience",
        heroSubtitle: "We are builders, storytellers, and operators.",
        body: "<p>Our mission is to empower teams to craft standout digital experiences with ease. From design systems to production pipelines, Nebula Studio keeps your content operations aligned.</p>",
        ctaLabel: "Meet the team",
        ctaUrl: "/company"
      },
      blocks: [
        {
          type: "timeline",
          data: {
            items: [
              { year: "2021", label: "Nebula founded" },
              { year: "2022", label: "Seed funding secured" },
              { year: "2023", label: "Global launch" }
            ]
          }
        }
      ]
    },
    adminId
  );

  await ensureEntry(
    site.id,
    pageContentType.id,
    {
      slug: "vista-previa",
      title: "Bienvenido a Nebula Studio",
      status: "published",
      publishAt: twoDaysAgo,
      locale: "es",
      data: {
        heroTitle: "Crea experiencias digitales estelares",
        heroSubtitle: "Nebula Studio ayuda a los equipos a diseñar y publicar contenido más rápido.",
        body: "<p>Nebula Studio combina un CMS sin cabeza con una experiencia de edición moderna y colaborativa.</p>",
        ctaLabel: "Ver documentación",
        ctaUrl: "/es/docs"
      },
      blocks: [
        {
          type: "hero",
          data: {
            eyebrow: "Nuevo",
            heading: "La próxima generación de CMS",
            byline: "Flexible, componible y listo para equipos globales."
          }
        }
      ]
    },
    adminId
  );

  await ensureEntry(
    site.id,
    pageContentType.id,
    {
      slug: "product-launch",
      title: "Nebula Studio launch event",
      status: "scheduled",
      publishAt: inThreeDays,
      locale: "en",
      data: {
        heroTitle: "Join our live launch event",
        heroSubtitle: "See Nebula Studio in action and get a peek at the roadmap.",
        body: "<p>We are hosting a live session to showcase workflows, integrations, and our vision for the future of content platforms.</p>",
        ctaLabel: "Save your seat",
        ctaUrl: "https://nebula.dev/launch"
      },
      blocks: [
        {
          type: "event-details",
          data: {
            startsAt: inThreeDays.toISOString(),
            durationMinutes: 60,
            speakers: [
              { name: "Avery Admin", title: "Head of Product" },
              { name: "Eden Editor", title: "Lead Designer" }
            ]
          }
        }
      ]
    },
    adminId
  );

  await ensureEntry(
    site.id,
    postContentType.id,
    {
      slug: "introducing-nebula-cms",
      title: "Introducing Nebula Studio",
      status: "published",
      publishAt: twoDaysAgo,
      locale: "en",
      data: {
        excerpt: "Learn how Nebula Studio brings structured content, workflows, and delivery together in one cohesive platform.",
        heroImage: "https://images.unsplash.com/photo-1529101091764-c3526daf38fe",
        category: "Announcements",
        tags: ["nextjs", "headless", "release"],
        body: "<p>Today we are excited to unveil Nebula Studio. Built with Next.js 14, MongoDB, and a modern toolchain, it is engineered for teams shipping ambitious digital products.</p>",
        featured: true
      },
      blocks: [
        {
          type: "quote",
          data: {
            text: "Nebula Studio gives our editors superpowers.",
            attribution: "Ari Author, Content Strategist"
          }
        },
        {
          type: "richtext",
          data: {
            html: "<p>From flexible content modeling to visual previews, Nebula Studio streamlines the entire content lifecycle.</p>"
          }
        }
      ]
    },
    adminId
  );

  await ensureEntry(
    site.id,
    postContentType.id,
    {
      slug: "composable-content-guide",
      title: "A guide to composable content",
      status: "draft",
      locale: "en",
      publishAt: null,
      data: {
        excerpt: "Best practices for modeling and delivering composable content across channels.",
        category: "Tutorials",
        tags: ["guides", "headless"],
        body: "<p>Use Nebula Studio blocks and scheduling tools to orchestrate omnichannel campaigns.</p>",
        featured: false
      }
    },
    adminId
  );

  await ensureEntry(
    site.id,
    postContentType.id,
    {
      slug: "roadmap-q2",
      title: "Nebula Studio Q2 roadmap",
      status: "scheduled",
      publishAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10),
      locale: "en",
      data: {
        excerpt: "Peek into what is shipping next quarter, from media automation to granular permissions.",
        category: "Product",
        tags: ["release"],
        body: "<p>We are focused on enhancing collaboration and extending integrations across the ecosystem.</p>",
        featured: false
      },
      blocks: [
        {
          type: "roadmap",
          data: {
            items: [
              { label: "Media automation", status: "In progress" },
              { label: "Granular RBAC", status: "Planned" },
              { label: "Visual workflows", status: "Discovery" }
            ]
          }
        }
      ]
    },
    adminId
  );

  const entrySummary = await entryRepository.countByStatus(site.id);
  console.log("✅ Seed completed", entrySummary);
};

try {
  await seed();
} catch (error) {
  console.error("❌ Failed to seed database", error);
  process.exitCode = 1;
} finally {
  await disconnectFromDatabase();
}
