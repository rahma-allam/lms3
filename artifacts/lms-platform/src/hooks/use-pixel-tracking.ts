import { useEffect, useCallback } from "react";
import { useGetSettings } from "@workspace/api-client-react";
import { useLocation } from "wouter";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void; page: () => void };
    dataLayer?: unknown[];
  }
}

let injectedMeta: string | null = null;
let injectedGTM: string | null = null;
let injectedTikTok: string | null = null;

function injectScript(id: string, html: string) {
  if (document.getElementById(id)) return;
  const div = document.createElement("div");
  div.innerHTML = html;
  div.id = id;
  document.head.appendChild(div);
}

export function usePixelTracking() {
  const { data: settings } = useGetSettings({ query: { queryKey: ["settings"] } });
  const [location] = useLocation();

  useEffect(() => {
    if (!settings) return;

    if (settings.metaPixelId && injectedMeta !== settings.metaPixelId) {
      injectedMeta = settings.metaPixelId;
      injectScript("meta-pixel", `<script>
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${settings.metaPixelId}');
        fbq('track', 'PageView');
      </script>`);
    }

    if (settings.googleTagId && injectedGTM !== settings.googleTagId) {
      injectedGTM = settings.googleTagId;
      injectScript("google-tag", `<script async src="https://www.googletagmanager.com/gtag/js?id=${settings.googleTagId}"></script>
      <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.googleTagId}');</script>`);
    }

    if (settings.tiktokPixelId && injectedTikTok !== settings.tiktokPixelId) {
      injectedTikTok = settings.tiktokPixelId;
      injectScript("tiktok-pixel", `<script>
        !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._n=ttq._n||{};ttq._n[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${settings.tiktokPixelId}');
        ttq.page();
      }(window, document, 'ttq');
      </script>`);
    }
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    if (settings.metaPixelId && window.fbq) window.fbq("track", "ViewContent");
    if (settings.googleTagId && window.gtag) window.gtag("event", "page_view");
    if (settings.tiktokPixelId && window.ttq) window.ttq.track("ViewContent");
  }, [location, settings]);

  const trackPurchase = useCallback((amount: number, currency: string = "USD") => {
    if (settings?.metaPixelId && window.fbq) {
      window.fbq("track", "Purchase", { value: amount, currency });
    }
    if (settings?.googleTagId && window.gtag) {
      window.gtag("event", "purchase", { value: amount, currency });
    }
    if (settings?.tiktokPixelId && window.ttq) {
      window.ttq.track("CompletePayment", { value: amount, currency });
    }
  }, [settings]);

  return { trackPurchase };
}
