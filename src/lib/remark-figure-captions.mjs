function getStandaloneImage(node) {
  if (!node || node.type !== 'paragraph' || !Array.isArray(node.children)) return null;
  if (node.children.length !== 1) return null;

  const onlyChild = node.children[0];
  if (!onlyChild || onlyChild.type !== 'image') return null;

  const caption = String(onlyChild.alt || '').trim();
  if (!caption) return null;

  return {
    src: onlyChild.url,
    alt: caption,
    title: onlyChild.title ? String(onlyChild.title) : undefined
  };
}

function visit(node) {
  if (!node || !Array.isArray(node.children)) return;

  for (const child of node.children) {
    const image = getStandaloneImage(child);
    if (image) {
      child.data = {
        hName: 'figure',
        hProperties: { className: ['article-figure'] },
        hChildren: [
          {
            type: 'element',
            tagName: 'img',
            properties: {
              src: image.src,
              alt: image.alt,
              ...(image.title ? { title: image.title } : {})
            },
            children: []
          },
          {
            type: 'element',
            tagName: 'figcaption',
            properties: { className: ['article-figcaption'] },
            children: [{ type: 'text', value: image.alt }]
          }
        ]
      };
      child.children = [];
      continue;
    }

    visit(child);
  }
}

export default function remarkFigureCaptions() {
  return (tree) => {
    visit(tree);
  };
}
