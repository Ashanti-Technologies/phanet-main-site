import { APP_CONFIG } from '@/constants'
import { MetadataRoute } from 'next'
import { getAllEvents } from '@/lib/events-data'

// Hourly, so newly published events show up without a redeploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const events = await getAllEvents()
    return [
        {
            url: APP_CONFIG.siteUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${APP_CONFIG.siteUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${APP_CONFIG.siteUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${APP_CONFIG.siteUrl}/events`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        ...events.map((event) => ({
            url: `${APP_CONFIG.siteUrl}/events/${event.slug}`,
            lastModified: event.updatedAt ? new Date(event.updatedAt) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        })),
    ]
} 