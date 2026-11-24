import { APP_CONFIG } from '@/constants'
import { MetadataRoute } from 'next'
import { getAllEvents } from '@/lib/events-data'
import { prisma } from '@/lib/database'

// Hourly, so newly published events show up without a redeploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [events, books, albums] = await Promise.all([
        getAllEvents(),
        prisma.publication.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
        prisma.galleryAlbum.findMany({ where: { status: 'PUBLISHED', visibility: 'PUBLIC' }, select: { slug: true, updatedAt: true } }),
    ])
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
        {
            url: `${APP_CONFIG.siteUrl}/library`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        ...books.map((book) => ({
            url: `${APP_CONFIG.siteUrl}/library/${book.slug}`,
            lastModified: book.updatedAt,
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        })),
        {
            url: `${APP_CONFIG.siteUrl}/gallery`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        ...albums.map((album) => ({
            url: `${APP_CONFIG.siteUrl}/gallery/${album.slug}`,
            lastModified: album.updatedAt,
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        })),
        ...events.map((event) => ({
            url: `${APP_CONFIG.siteUrl}/events/${event.slug}`,
            lastModified: event.updatedAt ? new Date(event.updatedAt) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        })),
    ]
} 