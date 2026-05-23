import { visit } from 'unist-util-visit'

export function remarkEmbed() {
  return function (tree) {
    visit(tree, (node) => {
      if (node.type === 'leafDirective') {
        if (!['youtube', 'bilibili', 'codepen'].includes(node.name)) return

        const data = node.data || (node.data = {})
        const attributes = node.attributes || {}
        const id = attributes.id

        if (!id) return

        // Validate embed IDs against expected patterns
        const validators = {
          youtube: /^[a-zA-Z0-9_-]{11}$/,
          bilibili: /^BV[a-zA-Z0-9]+$/,
          codepen: /^[a-zA-Z]+$/,
        }
        const validator = validators[node.name]
        if (validator && !validator.test(id)) return

        data.hName = 'iframe'
        switch (node.name) {
          case 'youtube':
            data.hProperties = {
              class: 'video',
              title: 'YouTube Video Player',
              src: `https://www.youtube.com/embed/${id}`,
              frameBorder: 0,
              allow:
                'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
              allowFullScreen: true,
              loading: 'lazy',
            }
            break
          case 'bilibili':
            data.hProperties = {
              class: 'video',
              title: 'Bilibili Video Player',
              src: `https://player.bilibili.com/player.html?isOutside=true&bvid=${id}`,
              frameBorder: 0,
              allowFullScreen: true,
              loading: 'lazy',
            }
            break
          case 'codepen':
            data.hProperties = {
              class: 'codepen',
              title: 'CodePen Embed',
              src: `https://codepen.io/${attributes.author}/embed/${id}`,
              frameBorder: 0,
              allowFullScreen: true,
              loading: 'lazy',
            }
            break
        }
      }
    })
  }
}
