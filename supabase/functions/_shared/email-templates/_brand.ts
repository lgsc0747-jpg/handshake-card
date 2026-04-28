/// <reference types="npm:@types/react@18.3.1" />
// Shared brand tokens for handshake-card emails.
// Body background MUST be white (#ffffff). Branded "card" sits inside it.

export const brand = {
  body: { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Arial, sans-serif', margin: 0, padding: '40px 20px' },
  container: { backgroundColor: '#0f172a', borderRadius: '20px', padding: '40px 32px', maxWidth: '520px', margin: '0 auto', boxShadow: '0 10px 40px rgba(13, 148, 136, 0.15)' },
  brandRow: { textAlign: 'center' as const, marginBottom: '28px' },
  brandMark: { display: 'inline-block', padding: '6px 14px', borderRadius: '999px', backgroundColor: 'rgba(13, 148, 136, 0.15)', color: '#5eead4', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  h1: { fontSize: '24px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px', lineHeight: 1.2 },
  text: { fontSize: '15px', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 20px' },
  link: { color: '#5eead4', textDecoration: 'underline' },
  button: { backgroundColor: '#0d9488', color: '#ffffff', fontSize: '15px', fontWeight: 600, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' },
  code: { fontFamily: '"SF Mono", "Menlo", "Courier New", monospace', fontSize: '28px', fontWeight: 700, color: '#5eead4', letterSpacing: '8px', backgroundColor: 'rgba(13, 148, 136, 0.1)', padding: '16px 24px', borderRadius: '12px', display: 'inline-block', margin: '8px 0 24px' },
  divider: { borderColor: 'rgba(148, 163, 184, 0.15)', margin: '28px 0' },
  footer: { fontSize: '12px', color: '#64748b', margin: '24px 0 0', lineHeight: 1.5 },
} as const;
