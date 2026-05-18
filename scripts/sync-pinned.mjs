import { readdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const USERNAME = 'sixtdreanight'
const PROJECTS_DIR = join(import.meta.dirname, '..', 'src', 'content', 'projects')
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

if (!GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN not set')
  process.exit(1)
}

const QUERY = `
query {
  viewer {
    pinnedItems(first: 6) {
      nodes {
        ... on Repository {
          name
          description
          url
          owner { login }
        }
      }
    }
  }
}`

function repoKey(owner, name) {
  return `${owner}/${name}`
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function toYaml(repo) {
  const key = slug(repo.name)
  return {
    filename: `${key}.yaml`,
    content: `title: ${repo.name}
description: ${repo.description || `${repo.name} - GitHub repository`}
image: https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}
link: ${repo.url}
`,
  }
}

async function readProjects() {
  const files = await readdir(PROJECTS_DIR)
  const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
  const results = []
  for (const file of yamlFiles) {
    const content = await readFile(join(PROJECTS_DIR, file), 'utf-8')
    const linkMatch = content.match(/^link:\s*(.+)/m)
    if (linkMatch) results.push({ file, link: linkMatch[1].trim() })
  }
  return results
}

async function main() {
  console.log('Fetching pinned repos...')
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: QUERY }),
  })

  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} ${res.statusText}`)
    const body = await res.text()
    console.error(body)
    process.exit(1)
  }

  const json = await res.json()
  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2))
    process.exit(1)
  }

  const pinned = json.data.viewer.pinnedItems.nodes
  console.log(`Found ${pinned.length} pinned repos`)

  const pinnedKeys = new Set(pinned.map((r) => repoKey(r.owner.login, r.name)))
  const existing = await readProjects()
  const existingMap = new Map()
  for (const proj of existing) {
    const url = new URL(proj.link)
    const key = url.pathname.replace(/^\//, '')
    existingMap.set(key, proj.file)
  }

  let changed = false

  // Add new repos
  for (const repo of pinned) {
    const key = repoKey(repo.owner.login, repo.name)
    if (!existingMap.has(key)) {
      const { filename, content } = toYaml(repo)
      await writeFile(join(PROJECTS_DIR, filename), content)
      console.log(`+ ${filename}`)
      changed = true
    }
  }

  // Remove unpinned repos (only those that match the username)
  for (const [key, file] of existingMap) {
    if (!pinnedKeys.has(key) && key.startsWith(`${USERNAME}/`)) {
      await unlink(join(PROJECTS_DIR, file))
      console.log(`- ${file}`)
      changed = true
    }
  }

  if (!changed) {
    console.log('No changes')
  } else {
    console.log('Done')
  }
}

main()
