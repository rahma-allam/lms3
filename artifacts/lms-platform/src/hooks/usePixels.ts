import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useTenant } from "./useTenant";


function injectScript(src: string, id: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.src = src;
  s.async = true;
  document.head.appendChild(s);
}

function injectInlineScript(code: string, id: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.textContent = code;
  document.head.appendChild(s);
}

function initMetaPixel(pixelId: string) {
  if (window.fbq) return;
  injectInlineScript(
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`,
    "meta-pixel-base"
  );
}

function initGTM(tagId: string) {
  if (window.dataLayer) return;
  window.dataLayer = window.dataLayer || [];
  if (tagId.startsWith("GTM-")) {
    injectInlineScript(
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${tagId}');`,
      "gtm-base"
    );
  } else if (tagId.startsWith("G-") || tagId.startsWith("AW-")) {
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${tagId}`, "gtag-script");
    injectInlineScript(
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tagId}');`,
      "gtag-base"
    );
  }
}

function initTikTokPixel(pixelId: string) {
  if (window.ttq) return;
  injectInlineScript(
    `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixelId}');ttq.page();}(window,document,'ttq');`,
    "tiktok-pixel-base"
  );
}

export function usePixels() {
  const { theme } = useTenant();
  const [location] = useLocation();
  const initialized = useRef(false);

  useEffect(() => {
    if (!theme) return;

    if (theme.metaPixelId) initMetaPixel(theme.metaPixelId);
    if (theme.googleTagId) initGTM(theme.googleTagId);
    if (theme.tiktokPixelId) initTikTokPixel(theme.tiktokPixelId);

    initialized.current = true;
  }, [theme]);

  useEffect(() => {
    if (!initialized.current || !theme) return;

    if (theme.metaPixelId && window.fbq) {
      window.fbq("track", "ViewContent");
    }
    if (theme.googleTagId && window.dataLayer) {
      window.dataLayer.push({ event: "page_view", page_path: location });
    }
    if (theme.tiktokPixelId && window.ttq) {
      window.ttq.page();
    }
  }, [location, theme]);
}

export function trackPurchase(value: number, currency: string, orderId?: string) {
  if (window.fbq) {
    window.fbq("track", "Purchase", { value, currency, order_id: orderId });
  }
  if (window.dataLayer) {
    window.dataLayer.push({
      event: "purchase",
      ecommerce: { transaction_id: orderId, value, currency },
    });
  }
  if (window.ttq) {
    window.ttq.track("CompletePayment", { value, currency, order_id: orderId });
  }
}
