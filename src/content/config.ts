import { z, defineCollection } from 'astro:content'

const weeklyCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    weekStart: z.string(),
    weekEnd: z.string(),
    events: z.array(z.object({
      id: z.string(),
      title: z.string(),
      impactScore: z.number().min(1).max(5),
      infoGainScore: z.number().min(1).max(5),
      summary: z.string(),
      timeline: z.array(z.object({
        id: z.string(),
        time: z.string(),
        title: z.string(),
        description: z.string(),
        evidenceRefs: z.array(z.string()),
      })),
      evidence: z.array(z.object({
        id: z.string(),
        sourceType: z.enum(["官媒", "社交平台", "一手材料", "其他"]),
        sourceName: z.string(),
        sourceUrl: z.string().nullable(),
        content: z.string(),
        authenticity: z.enum(["真实", "存疑", "不实", "待验证"]),
        aiReason: z.string(),
      })),
      edges: z.array(z.object({
        from: z.string(),
        to: z.string(),
        type: z.enum(["因果", "关联", "反驳"]),
        description: z.string(),
      })),
    })),
  }),
})

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    lastMod: z.date().optional(),
    summary: z.string().optional(),
    cover: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    comments: z.boolean().default(true),
    draft: z.boolean().default(false),
    sticky: z.number().default(0),
  }),
})

const projectsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    link: z.string().url(),
  }),
})

const specCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    comments: z.boolean().default(true),
  }),
})

const friendsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    avatar: z.string(),
    link: z.string().url(),
  }),
})

export const collections = {
  posts: postsCollection,
  projects: projectsCollection,
  spec: specCollection,
  friends: friendsCollection,
  weekly: weeklyCollection,
}
