import Userplex from 'userplex';

export const userplexClient = new Userplex({
  apiKey: process.env['USERPLEX_API_KEY'], // This is the default and can be omitted
});
