export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/debug/', '/testing/'],
    },
    sitemap: 'https://noos-learning.vercel.app/sitemap.xml',
  };
}
