import { APP_CONFIG } from '@/constants'
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/api/og/*'],
            disallow: ['/private/', '/admin/'],
        },
        sitemap: `${APP_CONFIG.siteUrl}/sitemap.xml`,
    }
} 