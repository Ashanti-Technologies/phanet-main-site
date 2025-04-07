
export const IS_DEV = process.env.NODE_ENV === 'development'
export const APP_CONFIG = {
    siteUrl: IS_DEV ? 'http://localhost:3000' : "https://phanerosisnetwork.com",
    contactEmail: "contact@phanerosisnetwork.com"
}