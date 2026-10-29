export const environment = {
  // API servie par Caddy sur la VM (voir brume_infra). Même site que le front
  // (app.ybrume.duckdns.org) : indispensable au cookie de session SameSite=Lax.
  apiUrl: 'https://api.ybrume.duckdns.org/api',
};
