import type { EventoRastreio } from "@/types";

export interface TrackingResult {
  events: EventoRastreio[];
  source: "linketrack" | "correios" | "basic" | "none";
  message: string;
}

function normalizeDate(input?: string): string {
  if (!input) return new Date().toISOString().split("T")[0];
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

function mapCorreiosEvents(payload: any): EventoRastreio[] {
  const possibleEvents =
    payload?.events ||
    payload?.eventos ||
    payload?.tracking ||
    payload?.resultado?.eventos ||
    [];

  if (!Array.isArray(possibleEvents)) return [];

  return possibleEvents
    .map((evt: any) => {
      const descricao =
        evt?.status ||
        evt?.description ||
        evt?.descricao ||
        evt?.texto ||
        "Rastreamento atualizado";

      return {
        data: normalizeDate(evt?.date || evt?.data || evt?.created_at),
        descricao,
      };
    })
    .filter((evt: EventoRastreio) => !!evt.descricao);
}

function isCorreiosCode(code: string): boolean {
  const clean = (code || "").trim().toUpperCase();
  return /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(clean);
}

export async function fetchTrackingEvents(
  trackingNumber: string,
  carrier?: string | null
): Promise<TrackingResult> {
  const cleanTracking = (trackingNumber || "").trim();
  const cleanCarrier = (carrier || "").trim();

  if (!cleanTracking) {
    return { events: [], source: "none", message: "Sem código de rastreio" };
  }

  const linketrackToken = process.env.LINKETRACK_API_TOKEN;
  const linketrackUser =
    process.env.LINKETRACK_USER || process.env.SHOPIFY_STORE_ADMIN_EMAIL;

  if (linketrackToken && linketrackUser) {
    try {
      const linketrackUrl = new URL("https://api.linketrack.com/track/json");
      linketrackUrl.searchParams.append("user", linketrackUser);
      linketrackUrl.searchParams.append("token", linketrackToken);
      linketrackUrl.searchParams.append("codigo", cleanTracking);

      const response = await fetch(linketrackUrl.toString());
      const payload = await response.json();

      if (payload?.resultado === 1 && Array.isArray(payload?.eventos)) {
        const events: EventoRastreio[] = payload.eventos.map((evt: any) => ({
          data: normalizeDate(evt?.data),
          descricao: evt?.status || "Rastreamento atualizado",
        }));

        return {
          events,
          source: "linketrack",
          message: `${events.length} evento(s) via LinkeTrack`,
        };
      }
    } catch (error) {
      console.error("Erro ao consultar LinkeTrack:", error);
    }
  }

  if (isCorreiosCode(cleanTracking) || /correios/i.test(cleanCarrier)) {
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/correios/v1/${encodeURIComponent(cleanTracking)}`
      );

      if (response.ok) {
        const payload = await response.json();
        const events = mapCorreiosEvents(payload);
        if (events.length > 0) {
          return {
            events,
            source: "correios",
            message: `${events.length} evento(s) via Correios`,
          };
        }
      }
    } catch (error) {
      console.error("Erro ao consultar Correios:", error);
    }
  }

  const basicCarrier = cleanCarrier || "Transportadora";
  return {
    events: [
      {
        data: new Date().toISOString().split("T")[0],
        descricao: `Rastreado com ${basicCarrier}: ${cleanTracking}`,
      },
    ],
    source: "basic",
    message: "Rastreamento básico obtido",
  };
}
