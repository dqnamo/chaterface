"use client";

import Userplex from 'userplex';

export const userplexClient = new Userplex({
  apiKey:  process.env.NEXT_PUBLIC_USERPLEX_API_KEY,
});
