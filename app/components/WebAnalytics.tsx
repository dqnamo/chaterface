"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { userplexClient } from "@/lib/userplexClient";

interface WebAnalyticsProps {
  country?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  latitude?: string;
  longitude?: string;
}

export default function WebAnalytics({
  country,
  city,
  region,
  postal_code,
  latitude,
  longitude,
}: WebAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const trackPageView = async () => {
      const url = `${window.location.origin}${pathname}${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`;

      const data = {
        url: url,
        referrer: document.referrer || "direct",
        // Next.js (Vercel) automatically provides country code in headers,
        // but from the client side, we can't see the IP/Country unless
        // the API endpoint detects it from the request headers.
      };

      try {
        userplexClient.logs.new({
          name: "page_viewed",
          data: {
            page: pathname,
            referrer: document.referrer || "direct",
            url: url,
            country: country || "unknown",
            city: city || "unknown",
            region: region || "unknown",
            postal_code: postal_code || "unknown",
            latitude: latitude || "unknown",
            longitude: longitude || "unknown",
          },
        });
      } catch (err) {
        console.error("Analytics failed", err);
      }
    };

    trackPageView();
  }, [pathname, searchParams]); // This triggers on every URL change

  return null; // This component doesn't render anything
}
