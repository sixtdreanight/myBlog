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
    repositories(first: 50, ownerAffiliations: OWNER, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        name
        description
        url
        owner { login }
        object(expression: "HEAD:README.md") {
          ... on Blob {
            text
          }
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

  const repos = json.data.viewer.repositories.nodes
  const withReadme = repos.filter((r) => r.object && r.object.text)
  console.log(`Found ${repos.length} repos, ${withReadme.length} have README`)

  const readmeKeys = new Set(withReadme.map((r) => repoKey(r.owner.login, r.name)))
  const existing = await readProjects()
  const existingMap = new Map()
  for (const proj of existing) {
    const url = new URL(proj.link)
    const key = url.pathname.replace(/^\//, '')
    existingMap.set(key, proj.file)
  }

  let changed = false

  // Add repos that have README
  for (const repo of withReadme) {
    const key = repoKey(repo.owner.login, repo.name)
    if (!existingMap.has(key)) {
      const { filename, content } = toYaml(repo)
      await writeFile(join(PROJECTS_DIR, filename), content)
      console.log(`+ ${filename}`)
      changed = true
    }
  }

  // Remove repos that no longer have README
  for (const [key, file] of existingMap) {
    if (!readmeKeys.has(key) && key.startsWith(`${USERNAME}/`)) {
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
