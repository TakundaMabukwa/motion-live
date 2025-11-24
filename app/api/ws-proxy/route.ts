import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const prefix = searchParams.get('prefix');
  
  if (!prefix) {
    return new Response('Missing prefix', { status: 400 });
  }

  const PORT_MAPPING: Record<string, number> = {
    'AIXX': 8001, 'ALDA': 8002, 'ALST': 8003, 'AVVA': 8004, 'BACA': 8005,
    'BLUE': 8006, 'CONC': 8007, 'COUN': 8008, 'DACO': 8009, 'DAWN': 8010,
    'DELA': 8011, 'DUPL': 8012, 'EDGE': 8013, 'ELIZ': 8014, 'EPSC': 8015,
    'EUXX': 8016, 'FIRS': 8017, 'FRSU': 8018, 'FUSP': 8019, 'GOEA': 8020,
    'GRAV': 8021, 'HIMA': 8022, 'HITA': 8023, 'ICON': 8024, 'INTA': 8025,
    'JCAG': 8026, 'JOLO': 8027, 'KANO': 8028, 'KEAD': 8029, 'KELO': 8030,
    'KERI': 8031, 'LECO': 8032, 'LTSX': 8033, 'MACS': 8034, 'MAGO': 8035,
    'MAIB': 8036, 'MASS': 8037, 'MAVA': 8038, 'META': 8039, 'MNFU': 8040,
    'NNSL': 8041, 'PETE': 8042, 'PIRT': 8043, 'PRCR': 8044, 'RIGH': 8045,
    'SEVE': 8046, 'SGMO': 8047, 'SIVE': 8048, 'SPAR': 8049, 'STGR': 8050,
    'STRU': 8051, 'TALI': 8052, 'TRIA': 8053, 'TYSO': 8054, 'VDMX': 8055,
    'WACA': 8056
  };

  const port = PORT_MAPPING[prefix.toUpperCase()] || 8100;
  const wsUrl = `ws://178.128.201.160:${port}/${prefix.toUpperCase()}`;

  const stream = new ReadableStream({
    async start(controller) {
      const WebSocket = (await import('ws')).default;
      const ws = new WebSocket(wsUrl, {
        perMessageDeflate: false,
        handshakeTimeout: 5000
      });
      let isClosed = false;

      ws.on('message', (data) => {
        if (!isClosed) {
          try {
            controller.enqueue(`data: ${data}\n\n`);
          } catch (e) {
            isClosed = true;
          }
        }
      });

      ws.on('error', () => {
        if (!isClosed) {
          isClosed = true;
          try { controller.close(); } catch (e) {}
        }
      });

      ws.on('close', () => {
        if (!isClosed) {
          isClosed = true;
          try { controller.close(); } catch (e) {}
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
