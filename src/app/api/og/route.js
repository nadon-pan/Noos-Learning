import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F1117',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Blue ambient glow top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(21,127,236,0.25) 0%, transparent 65%)',
            display: 'flex',
          }}
        />
        {/* Steel blue glow bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(94,120,163,0.2) 0%, transparent 65%)',
            display: 'flex',
          }}
        />

        {/* Logo text */}
        <div
          style={{
            fontSize: '96px',
            fontWeight: '800',
            color: '#FFFFFF',
            letterSpacing: '-2px',
            marginBottom: '8px',
            display: 'flex',
          }}
        >
          Noos
        </div>

        {/* Blue accent line */}
        <div
          style={{
            width: '80px',
            height: '4px',
            background: '#157FEC',
            borderRadius: '2px',
            marginBottom: '32px',
            display: 'flex',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: '36px',
            fontWeight: '500',
            color: '#A0A8C0',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: '1.4',
            display: 'flex',
          }}
        >
          Wordle, but smarter.
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: '24px',
            fontWeight: '400',
            color: '#5E78A3',
            textAlign: 'center',
            marginTop: '16px',
            display: 'flex',
          }}
        >
          Chat with an AI bot to extract clues and guess the mystery term.
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              background: '#157FEC',
              borderRadius: '20px',
              padding: '8px 24px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#FFFFFF',
              display: 'flex',
            }}
          >
            Play Now — noos-learning.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
