import { ImageResponse } from 'next/og'
import { APP_CONFIG } from '@/constants'

export const runtime = 'edge'


const size = {
    width: 1200,
    height: 630,
}
// const contentType = 'image/png'


export async function GET() {

    const dmSansFontData = await fetch(
        `${APP_CONFIG.siteUrl}/fonts/DMSans-Bold.ttf`
    ).then(async (res) => await res.arrayBuffer());

    // const dmSansFontData = await fetch(
    //     new URL('DMSans-Bold.ttf', import.meta.url)
    // ).then((res) => res.arrayBuffer());
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom, #1a1a1a, #000000)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px',
                    color: 'white',
                    fontFamily: '"DM Sans", sans-serif',
                }}
            >
                <h1
                    style={{
                        fontSize: '72px',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        background: 'linear-gradient(to right, #ffffff, #cccccc)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        textAlign: 'center'
                    }}
                >
                    Phanerosis Prayer Network International
                </h1>
                <p
                    style={{
                        fontSize: '32px',
                        marginBottom: '40px',
                        color: '#ffffff',
                        maxWidth: '800px',
                    }}
                >
                    Raising One Billion Intercessors Worldwide
                </p>
                <img
                    src={`${APP_CONFIG.siteUrl}/images/logo.png`}
                    alt="Phanet - Raising One Billion Intercessors Worldwide"
                    style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                    }}
                />
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'DM Sans',
                    data: dmSansFontData,
                    style: 'normal',
                    weight: 700,
                },
            ],
        }
    )
}
